import prettyMs from "npm:pretty-ms@8.0.0";
import { program } from "npm:commander@10.0.0";
import { resolve } from "https://deno.land/std@0.178.0/path/mod.ts";
import * as colors from "https://deno.land/std@0.178.0/fmt/colors.ts";

const colorMap: Record<string, (msg: string) => string> = {
  debug: colors.gray,
  info: colors.cyan,
  warn: colors.yellow,
  error: colors.red,
};

program
  .name("rjl")
  .argument("[input-files...]", "The files to process")
  .option(
    "-l, --level <level>",
    "Only shows logs with the given level",
    (m, p: string[]) => p.concat([m]),
    []
  )
  .option(
    "-s, --start-date <date>",
    "Filters out all logs before this date",
    (d) => new Date(d).getTime()
  )
  .option(
    "-e, --end-date <date>",
    "Filters out all logs after this date",
    (d) => new Date(d).getTime()
  )
  .option(
    "-m, --module <module>",
    "Only shows logs from the given module",
    (m, p: string[]) => p.concat([m]),
    []
  )
  .option(
    "-n, --not-module <module>",
    "Hides logs from the given module",
    (m, p: string[]) => p.concat([m]),
    []
  )
  .option(
    "-f, --filter <message>",
    "Filters out logs where the message contains the given string",
    (m, p: string[]) => p.concat([m.toLowerCase()]),
    []
  );

/** Used for calculating the time difference between log lines */
let prevTime: number | null = null;

interface Options {
  startDate: number;
  endDate: number;
  level: string[];
  module: string[];
  notModule: string[];
  filter: string[];
}

interface Line {
  timestamp: string;
  message: string;
  module: string;
  level: string;
  [key: string]: string | number | boolean;
}

const decoder = new TextDecoder("utf-8");

const parseData = (data: Uint8Array): Array<Line | string> => {
  return decoder
    .decode(data)
    .split("\n")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_e) {
        return line;
      }
    })
    .filter((l) => l);
};

const bgColors = [
  colors.bgCyan,
  colors.bgGreen,
  colors.bgMagenta,
  colors.bgYellow,
  colors.bgWhite,
];

const processLine = (
  line: Line | string | undefined,
  options: Options,
  logIndex?: number
) => {
  if (!line) {
    return;
  }

  const indexText =
    typeof logIndex !== "undefined"
      ? bgColors[logIndex % bgColors.length]!(
          colors.black(colors.bold(`[${logIndex}]`))
        )
      : null;

  if (typeof line === "string") {
    const logLine = indexText
      ? indexText + " " + colors.gray(line)
      : colors.gray(line);
    console.log(logLine);
    return;
  }

  const { module, level, message, timestamp, ...data } = line;
  const logTime = new Date(timestamp).getTime();
  const lowerCaseMessage = message.toLowerCase();

  if (options.level.length && !options.level.includes(level)) {
    return;
  }

  if (options.module.length && !options.module.includes(module)) {
    return;
  }

  if (options.notModule.includes(module)) {
    return;
  }

  if (
    options.filter.length &&
    options.filter.some((f) => lowerCaseMessage.includes(f))
  ) {
    return;
  }

  if (options.startDate && logTime < options.startDate) {
    return;
  }

  if (options.endDate && logTime > options.endDate) {
    return;
  }

  const timeDiff = prevTime ? logTime - prevTime : null;
  const duration = colors.gray(
    timeDiff !== null ? `[${prettyMs(timeDiff)}]` : "[--]"
  );
  prevTime = logTime;

  if ((timeDiff ?? 0) > 60000) {
    console.log();
    console.log();
    console.log(colors.green(colors.bold(timestamp)));
    console.log();
  } else if ((timeDiff ?? 0) > 2500) {
    console.log();
    console.log();
  }

  const prefix = (colorMap[level] ?? colors.reset)(`[${module ?? level}]`);
  const timestampText = colors.gray(`[${timestamp}]`);

  const dataString = JSON.stringify(data, null, 2)
    .split("\n")
    .slice(1, -1)
    .join("\n");

  if (indexText) {
    console.log(indexText, prefix, duration, timestampText, message);
  } else {
    console.log(prefix, duration, timestampText, message);
  }

  if (dataString) {
    console.log(colors.gray(dataString));
  }

  console.log();
};

const processData = (data: Uint8Array, options: Options) => {
  const lines = parseData(data);

  lines.forEach(function (line) {
    processLine(line, options);
  });
};

const readFiles = async (inputPaths: string[]) => {
  try {
    return await Promise.all(
      inputPaths.map((f: string) => Deno.readFile(resolve(Deno.cwd(), f)))
    );
  } catch (e) {
    console.error("Couldn't read files:", e);
    return null;
  }
};

program.action(async (inputPaths, options: Options) => {
  if (inputPaths.length) {
    const contents = await readFiles(inputPaths);

    if (!contents) {
      return;
    }

    const lines = contents.map((c) => parseData(c));
    const pointers = contents.map(() => 0);

    while (true) {
      const nextLines = pointers.map((p, i) => lines[i]![p]!);

      if (!nextLines.some((l) => l)) {
        break;
      }

      // Process unknown lines first
      for (const [i, line] of nextLines.entries()) {
        if (line && (typeof line === "string" || !line?.timestamp)) {
          processLine(line, options, i);
          pointers[i]++;
          continue;
        }
      }

      const [earliestLine] = [...nextLines.entries()]
        .filter((l): l is [number, Line] => !!l[1] && typeof l[1] !== "string")
        .sort(
          (a, b) =>
            new Date(a[1].timestamp).getTime() -
            new Date(b[1].timestamp).getTime()
        );

      if (!earliestLine) {
        throw new Error("No line found");
      }

      processLine(earliestLine[1], options, earliestLine[0]);
      pointers[earliestLine[0]]++;
    }
  } else {
    let localBuffer: Uint8Array | undefined;

    while (true) {
      const buffer = new Uint8Array(1024);
      const length = (await Deno.stdin.read(buffer)) as number;
      const chunk = buffer.slice(0, length);

      // If the chunk of data doesn't end with a new-line, we'll store
      // the last line of it so we can merge it with the next chunk
      const data = localBuffer
        ? new Uint8Array([...localBuffer, ...chunk])
        : chunk;

      const newLineIndex = data.lastIndexOf(10);
      processData(data.slice(0, newLineIndex), options);
      localBuffer = data.slice(newLineIndex);
    }
  }
});

if (import.meta.main) {
  program.parse();
}
