#!/usr/bin/env bash
# Shared helpers for scripts running on the cPanel server. Source it, do not execute it.

# Loads shared/api.env and exports the libpq variables (PGHOST, PGUSER, PGPASSWORD…) derived from
# DATABASE_URL, so pg_dump never receives credentials on its command line (visible in `ps`).
# Nothing is printed.
load_database_env() {
  local env_file="$1" pg_env
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
  : "${DATABASE_URL:?DATABASE_URL missing in $env_file}"
  # shellcheck disable=SC2016 # JavaScript source, must not be expanded by the shell
  pg_env="$(node -e '
    const url = new URL(process.env.DATABASE_URL);
    const quote = (value) => "\x27" + String(value).replace(/\x27/g, "\x27\\\x27\x27") + "\x27";
    const vars = {
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    };
    const sslmode = url.searchParams.get("sslmode");
    if (sslmode) vars.PGSSLMODE = sslmode;
    for (const [key, value] of Object.entries(vars)) console.log(`export ${key}=${quote(value)}`);
  ')"
  eval "$pg_env"
}

# Keeps the <keep> most recent *.dump files of <dir>. Usage: prune_dumps <dir> <keep>
prune_dumps() {
  local dir="$1" keep="$2"
  find "$dir" -maxdepth 1 -type f -name '*.dump' -printf '%T@ %p\n' | sort -rn |
    tail -n +"$((keep + 1))" | cut -d' ' -f2- | xargs -r rm -f
}

# Custom-format dump, verified with pg_restore --list. Usage: dump_database <file>
dump_database() {
  local file="$1"
  pg_dump --format=custom --no-owner --no-privileges --file="$file"
  chmod 600 "$file"
  pg_restore --list "$file" > /dev/null
}
