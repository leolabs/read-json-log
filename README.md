# RJL (Read JSON Log)

A Deno script that allows you to view JSON logs in a more readable manner. Logs can
either be loaded from a file or by piping it to stdin.

If you load multiple files at once, their lines are merged and each file is assigned
a separate color so you can differentiate the files from each other.

The script expects each log line to have a `module`, `timestamp`, and `message` field.

You can use the following options to filter logs:

```
Usage: index [options] [input-files...]

Arguments:
  input-files                The files to process

Options:
  -s, --start-date <date>    Filters out all logs before this date
  -e, --end-date <date>      Filters out all logs after this date
  -m, --module <module>      Only shows logs from the given module, can be used multiple times (default: [])
  -n, --not-module <module>  Only shows logs from the given module, can be used multiple times (default: [])
  -f, --filter <message>     Filters out logs where the message contains the given string (default: [])
  -h, --help                 display help for command
```

## Installing RJL

RJL requires [Deno](https://deno.land) to be installed. You can then use
the following command to install the script:

```sh
deno install --allow-read https://deno.land/x/rjl/rjl.ts
```
