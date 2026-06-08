"""
Вставляет CampaignAbilityStrings.txt из Downloads в карту translate.w3x по пути Units\\ внутри MPQ.

Требуется StormLib.dll (x64 для 64-bit Python):
  https://github.com/ladislav-zezula/StormLib/releases
  или архив: http://www.zezula.net/download/stormlib_dll.zip
По умолчанию ищется C:\\Users\\Syruf\\Desktop\\stormlib (корень, x64, Win64 и до 4 уровней вложенности).
Иначе: рядом со скриптом, STORMLIB_DLL.

Отладка: флаг --debug или -d, либо INJECT_W3X_DEBUG=1 (лог в stderr).

Аргументы командной строки (порядок важен):
  1) путь к .txt (исходные строки)
  2) путь к .w3x (карта)
  3) опционально путь внутри MPQ, например Units\\CampaignAbilityStrings.txt
Без аргументов используются пути по умолчанию в этом файле.
"""

from __future__ import annotations

import ctypes
import os
import struct
import sys
from ctypes import wintypes

# StormLib объявляет BOOL; через c_int избегаем неверной интерпретации возврата в ctypes.
BOOL = ctypes.c_int


def _configure_stdio() -> None:
    """UTF-8 в консоли Windows, чтобы русские сообщения не ломались."""
    if sys.platform != "win32":
        return
    for stream in (sys.stdout, sys.stderr):
        reconf = getattr(stream, "reconfigure", None)
        if callable(reconf):
            try:
                reconf(encoding="utf-8", errors="replace")
            except (OSError, ValueError, TypeError):
                pass


# Пути по умолчанию (можно переопределить аргументами)
DEFAULT_SOURCE = r"C:\Users\Syruf\Downloads\CampaignAbilityStrings.txt"
DEFAULT_MAP = r"C:\Users\Syruf\Desktop\Warcraft 128\Maps\translate.w3x"
# Внутри архива MPQ пути обычно с обратным слэшем
DEFAULT_INTERNAL_PATH = r"Units\CampaignAbilityStrings.txt"
# Папка со StormLib.dll (если не задана STORMLIB_DLL)
DEFAULT_STORMLIB_DIR = r"C:\Users\Syruf\Desktop\stormlib"

MPQ_FILE_COMPRESS = 0x00000200
MPQ_FILE_REPLACEEXISTING = 0x80000000
MPQ_COMPRESSION_ZLIB = 0x02
MPQ_COMPRESSION_NEXT_SAME = 0xFFFFFFFF


def _debug_enabled(argv: list[str]) -> bool:
    if os.environ.get("INJECT_W3X_DEBUG", "").strip().lower() in ("1", "true", "yes", "on"):
        return True
    return any(a in ("--debug", "-d") for a in argv)


def _strip_debug_flags(argv: list[str]) -> list[str]:
    return [a for a in argv if a not in ("--debug", "-d")]


def _dlog(debug: bool, *parts: object) -> None:
    if debug:
        print("[отладка]", *parts, file=sys.stderr, flush=True)


def _file_meta(path: str) -> str:
    try:
        st = os.stat(path)
        return f"size={st.st_size} mtime={st.st_mtime}"
    except OSError as e:
        return f"ошибка stat: {e}"


def _resolve_existing_file(path: str, role: str) -> str:
    """
    Нормализует путь и проверяет, что это существующий файл.
    role — фраза для сообщения: «исходного файла» или «карты».
    """
    raw = path
    p = path.strip()
    if len(p) >= 2 and p[0] == p[-1] and p[0] in "\"'":
        p = p[1:-1].strip()
    p = os.path.expandvars(os.path.expanduser(p))
    p = os.path.normpath(p)
    if not os.path.isabs(p):
        p = os.path.abspath(p)

    candidates = [p]
    if sys.platform == "win32" and not p.startswith("\\\\?\\"):
        if len(p) >= 2 and p[1] == ":":
            candidates.append("\\\\?\\" + p)
        elif p.startswith("\\\\") and not p.startswith("\\\\?\\"):
            candidates.append("\\\\?\\UNC\\" + p[2:])

    for cand in candidates:
        if os.path.isfile(cand):
            return cand

    primary = candidates[0]
    order_hint = ""
    if role == "карты":
        order_hint = (
            "\n  Частая ошибка: 1-й аргумент — это .txt, 2-й — .w3x. "
            "Если указать только карту первым аргументом, скрипт будет искать несуществующий txt."
            "\n  Пример: inject_campaign_ability_strings.py "
            "CampaignAbilityStrings.txt translate.w3x"
        )
    elif role == "исходного файла" and primary.lower().endswith((".w3x", ".w3m")):
        order_hint = (
            "\n  Похоже, первым аргументом указана карта (.w3x). "
            "Нужно: 1) путь к .txt  2) путь к .w3x."
        )
    raise FileNotFoundError(
        f"Нет {role}.\n"
        f"  Как введено: {raw!s}\n"
        f"  Проверен путь: {primary!s}\n"
        f"  exists={os.path.exists(primary)}, isfile={os.path.isfile(primary)}, "
        f"isdir={os.path.isdir(primary)}"
        f"{order_hint}"
    )


def _python_arch() -> str:
    return "64-bit" if struct.calcsize("P") * 8 == 64 else "32-bit"


def _stormlib_paths_under(root: str, max_depth: int = 4) -> list[str]:
    """Все StormLib.dll под root, не глубже max_depth."""
    out: list[str] = []
    root = os.path.normpath(root)
    if not os.path.isdir(root):
        return out
    for dirpath, dirnames, _ in os.walk(root):
        rel = os.path.relpath(dirpath, root)
        depth = 0 if rel in (".", "") else rel.count(os.sep) + 1
        if depth >= max_depth:
            dirnames.clear()
        candidate = os.path.join(dirpath, "StormLib.dll")
        if os.path.isfile(candidate):
            out.append(os.path.normpath(candidate))
    return out


def _pick_preferred_stormlib(paths: list[str]) -> str | None:
    """Предпочитает x64/Win64, избегает x86/Win32 в пути."""

    def sort_key(p: str) -> tuple[int, int]:
        low = p.lower()
        if "x86" in low or "\\win32" in low or "/win32" in low:
            return (2, len(p))
        if "x64" in low or "win64" in low or "amd64" in low:
            return (0, len(p))
        return (1, len(p))

    if not paths:
        return None
    return sorted(paths, key=sort_key)[0]


def _find_stormlib(debug: bool = False) -> str:
    env = os.environ.get("STORMLIB_DLL", "").strip()
    _dlog(debug, "STORMLIB_DLL=", repr(env) if env else "(не задана)")
    if env and os.path.isfile(env):
        _dlog(debug, "берём DLL из STORMLIB_DLL")
        return env
    if env and not os.path.isfile(env):
        _dlog(debug, "STORMLIB_DLL указана, но файл не найден:", env)
    here = os.path.dirname(os.path.abspath(__file__))
    desk = DEFAULT_STORMLIB_DIR
    candidates = [
        os.path.join(desk, "StormLib.dll"),
        os.path.join(desk, "x64", "StormLib.dll"),
        os.path.join(desk, "Win64", "StormLib.dll"),
        os.path.join(here, "StormLib.dll"),
        os.path.join(here, "..", "StormLib.dll"),
        os.path.join(os.getcwd(), "StormLib.dll"),
    ]
    _dlog(debug, "Python", sys.version.split()[0], ",", _python_arch())
    _dlog(debug, "проверка кандидатов StormLib.dll:")
    for p in candidates:
        np = os.path.normpath(p)
        ok = os.path.isfile(np)
        _dlog(debug, " ", np, "->", "есть" if ok else "нет")
        if ok:
            _dlog(debug, "   ", _file_meta(np))
            return np
    nested_all = _stormlib_paths_under(desk)
    _dlog(debug, "рекурсивно под", desk, "найдено", len(nested_all), "путей")
    for p in nested_all:
        _dlog(debug, " ", p, "|", _file_meta(p))
    nested = _pick_preferred_stormlib(nested_all)
    if nested:
        _dlog(debug, "выбран после сортировки (x64 приоритет):", nested)
        return nested
    raise FileNotFoundError(
        "Не найден StormLib.dll. Положите DLL в "
        f"{DEFAULT_STORMLIB_DIR} (или x64\\StormLib.dll), рядом со скриптом, "
        "либо задайте STORMLIB_DLL. Источники: GitHub ladislav-zezula/StormLib, "
        "zezula.net/download/stormlib_dll.zip (нужна x64 для 64-bit Python)."
    )


def _load_stormlib(dll_path: str):
    return ctypes.WinDLL(dll_path)


def inject_file(
    dll_path: str,
    map_path: str,
    source_file: str,
    internal_name: str,
    *,
    debug: bool = False,
) -> None:
    if not os.path.isfile(source_file):
        raise FileNotFoundError(f"Нет исходного файла: {source_file}")
    if not os.path.isfile(map_path):
        raise FileNotFoundError(f"Нет карты: {map_path}")

    _dlog(debug, "исходный файл:", _file_meta(source_file))
    _dlog(debug, "карта:", _file_meta(map_path))

    try:
        internal_b = internal_name.replace("/", "\\").encode("ascii", errors="strict")
    except UnicodeEncodeError as e:
        raise ValueError(
            "Путь внутри карты должен быть ASCII (латиница, цифры, слэши): "
            f"{internal_name!r}"
        ) from e

    storm = _load_stormlib(dll_path)
    _dlog(debug, "LoadLibrary StormLib.dll OK:", dll_path)
    storm.SFileOpenArchive.argtypes = [
        wintypes.LPCWSTR,
        wintypes.DWORD,
        wintypes.DWORD,
        ctypes.POINTER(wintypes.HANDLE),
    ]
    storm.SFileOpenArchive.restype = BOOL

    storm.SFileCloseArchive.argtypes = [wintypes.HANDLE]
    storm.SFileCloseArchive.restype = BOOL

    storm.SFileAddFileEx.argtypes = [
        wintypes.HANDLE,
        wintypes.LPCWSTR,
        ctypes.c_char_p,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.DWORD,
    ]
    storm.SFileAddFileEx.restype = BOOL

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    h_mpq = wintypes.HANDLE()
    # 0 priority, без MPQ_OPEN_READ_ONLY — открытие на запись
    kernel32.SetLastError(0)
    ok = storm.SFileOpenArchive(map_path, 0, 0, ctypes.byref(h_mpq))
    err_open = kernel32.GetLastError()
    ok_open = ok != 0
    hv = h_mpq.value
    hval = 0 if hv is None else int(hv)
    _dlog(
        debug,
        "SFileOpenArchive(",
        repr(map_path),
        ", 0, 0, h) -> ok=",
        ok_open,
        "raw=",
        ok,
        "h=",
        hex(hval),
        "GetLastError=",
        err_open,
    )
    # Успех определяем по дескриптору: возвращаемое BOOL в ctypes иногда приходит «мусорным».
    if hval == 0:
        raise OSError(f"SFileOpenArchive не удалось (код {err_open}): {map_path}")

    try:
        flags = MPQ_FILE_COMPRESS | MPQ_FILE_REPLACEEXISTING
        _dlog(
            debug,
            "SFileAddFileEx:",
            repr(source_file),
            "->",
            repr(internal_b.decode("ascii")),
            "flags=0x{:08X}".format(flags),
            "compress=ZLIB",
        )
        kernel32.SetLastError(0)
        ok = storm.SFileAddFileEx(
            h_mpq,
            source_file,
            internal_b,
            flags,
            MPQ_COMPRESSION_ZLIB,
            MPQ_COMPRESSION_NEXT_SAME,
        )
        err_add = kernel32.GetLastError()
        ok_add = ok != 0
        _dlog(debug, "SFileAddFileEx -> ok=", ok_add, "raw=", ok, "GetLastError=", err_add)
        if not ok_add:
            raise OSError(f"SFileAddFileEx не удалось (код {err_add}): {internal_name}")
    finally:
        kernel32.SetLastError(0)
        cok = storm.SFileCloseArchive(h_mpq)
        err_close = kernel32.GetLastError()
        _dlog(
            debug,
            "SFileCloseArchive -> ok=",
            cok != 0,
            "raw=",
            cok,
            "GetLastError=",
            err_close,
        )


def main() -> int:
    _configure_stdio()
    raw = sys.argv[1:]
    debug = _debug_enabled(raw)
    args = _strip_debug_flags(raw)
    src = DEFAULT_SOURCE
    mpq = DEFAULT_MAP
    internal = DEFAULT_INTERNAL_PATH
    if len(args) >= 1:
        src = args[0]
    if len(args) >= 2:
        mpq = args[1]
    if len(args) >= 3:
        internal = args[2].replace("/", "\\")

    if len(args) == 1 and args[0].lower().endswith((".w3x", ".w3m")):
        print(
            "Предупреждение: один аргумент с расширением .w3x/.w3m воспринимается как ИСХОДНЫЙ .txt, "
            "а не как карта. Нужны два пути: сначала .txt, потом .w3x.",
            file=sys.stderr,
        )

    if debug:
        _dlog(debug, "включено: --debug / -d или INJECT_W3X_DEBUG=1")
        _dlog(debug, "cwd:", os.getcwd())
        _dlog(debug, "__file__:", os.path.abspath(__file__))

    try:
        dll = _find_stormlib(debug=debug)
    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        return 1

    try:
        src = _resolve_existing_file(src, "исходного файла")
        mpq = _resolve_existing_file(mpq, "карты")
    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        return 1

    print(f"StormLib: {dll}")
    print(f"Источник: {src}")
    print(f"Карта:    {mpq}")
    print(f"Внутри:   {internal}")
    print("(Сделайте копию translate.w3x перед первым запуском.)")
    try:
        inject_file(dll, mpq, src, internal, debug=debug)
    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        return 1
    except OSError as e:
        print(f"Ошибка StormLib: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(e, file=sys.stderr)
        return 1

    print("Готово.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
