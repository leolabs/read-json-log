# RJL (Read JSON Log)

A Deno script that allows you to view JSON logs in a more readable manner. Logs can
either be loaded from a file or by piping them to stdin.

If you load multiple files at once, their lines are merged and each file is assigned
a separate color so you can differentiate them from each other.

The script expects each log line to have a `module`, `timestamp`, and `message` field.
Optionally, if a `level` field is present, it will be used for highlighting lines.

You can use the following options to filter logs:

```
Usage: rjl [options] [input-files...]

Arguments:
  input-files                The files to process

Options:
  -s, --start-date <date>    Filters out all logs before this date
  -e, --end-date <date>      Filters out all logs after this date
  -m, --module <module>      Only shows logs from the given module (default: [])
  -n, --not-module <module>  Hides logs from the given module (default: [])
  -f, --filter <message>     Filters out logs where the message contains the given string (default: [])
  -h, --help                 display help for command
```

## Installing RJL

RJL requires [Deno](https://deno.land) to be installed. You can then use
the following command to install the script:

```sh
deno install --allow-read -n rjl https://deno.land/x/rjl/cli.ts
```
