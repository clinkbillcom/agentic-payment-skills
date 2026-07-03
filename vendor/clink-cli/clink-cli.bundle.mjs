#!/usr/bin/env node
import{createRequire as __cr}from'module';const require=__cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.endsWith("...")) {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.minWidthToWrap = 40;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
       * and just before calling `formatHelp()`.
       *
       * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
       *
       * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
       */
      prepareContext(contextOptions) {
        this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleSubcommandTerm(helper.subcommandTerm(command))
            )
          );
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(
            max,
            this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
          );
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(
            max,
            this.displayWidth(
              helper.styleArgumentTerm(helper.argumentTerm(argument))
            )
          );
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (option.description) {
            return `${option.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescription = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescription}`;
          }
          return extraDescription;
        }
        return argument.description;
      }
      /**
       * Format a list of items, given a heading and an array of formatted items.
       *
       * @param {string} heading
       * @param {string[]} items
       * @param {Help} helper
       * @returns string[]
       */
      formatItemList(heading, items, helper) {
        if (items.length === 0) return [];
        return [helper.styleTitle(heading), ...items, ""];
      }
      /**
       * Group items by their help group heading.
       *
       * @param {Command[] | Option[]} unsortedItems
       * @param {Command[] | Option[]} visibleItems
       * @param {Function} getGroup
       * @returns {Map<string, Command[] | Option[]>}
       */
      groupItems(unsortedItems, visibleItems, getGroup) {
        const result = /* @__PURE__ */ new Map();
        unsortedItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) result.set(group, []);
        });
        visibleItems.forEach((item) => {
          const group = getGroup(item);
          if (!result.has(group)) {
            result.set(group, []);
          }
          result.get(group).push(item);
        });
        return result;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth ?? 80;
        function callFormatItem(term, description) {
          return helper.formatItem(term, termWidth, description, helper);
        }
        let output = [
          `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
          ""
        ];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.boxWrap(
              helper.styleCommandDescription(commandDescription),
              helpWidth
            ),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return callFormatItem(
            helper.styleArgumentTerm(helper.argumentTerm(argument)),
            helper.styleArgumentDescription(helper.argumentDescription(argument))
          );
        });
        output = output.concat(
          this.formatItemList("Arguments:", argumentList, helper)
        );
        const optionGroups = this.groupItems(
          cmd.options,
          helper.visibleOptions(cmd),
          (option) => option.helpGroupHeading ?? "Options:"
        );
        optionGroups.forEach((options, group) => {
          const optionList = options.map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(this.formatItemList(group, optionList, helper));
        });
        if (helper.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return callFormatItem(
              helper.styleOptionTerm(helper.optionTerm(option)),
              helper.styleOptionDescription(helper.optionDescription(option))
            );
          });
          output = output.concat(
            this.formatItemList("Global Options:", globalOptionList, helper)
          );
        }
        const commandGroups = this.groupItems(
          cmd.commands,
          helper.visibleCommands(cmd),
          (sub) => sub.helpGroup() || "Commands:"
        );
        commandGroups.forEach((commands, group) => {
          const commandList = commands.map((sub) => {
            return callFormatItem(
              helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
              helper.styleSubcommandDescription(helper.subcommandDescription(sub))
            );
          });
          output = output.concat(this.formatItemList(group, commandList, helper));
        });
        return output.join("\n");
      }
      /**
       * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
       *
       * @param {string} str
       * @returns {number}
       */
      displayWidth(str2) {
        return stripColor(str2).length;
      }
      /**
       * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
       *
       * @param {string} str
       * @returns {string}
       */
      styleTitle(str2) {
        return str2;
      }
      styleUsage(str2) {
        return str2.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word === "[command]") return this.styleSubcommandText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleCommandText(word);
        }).join(" ");
      }
      styleCommandDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleOptionDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleSubcommandDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleArgumentDescription(str2) {
        return this.styleDescriptionText(str2);
      }
      styleDescriptionText(str2) {
        return str2;
      }
      styleOptionTerm(str2) {
        return this.styleOptionText(str2);
      }
      styleSubcommandTerm(str2) {
        return str2.split(" ").map((word) => {
          if (word === "[options]") return this.styleOptionText(word);
          if (word[0] === "[" || word[0] === "<")
            return this.styleArgumentText(word);
          return this.styleSubcommandText(word);
        }).join(" ");
      }
      styleArgumentTerm(str2) {
        return this.styleArgumentText(str2);
      }
      styleOptionText(str2) {
        return str2;
      }
      styleArgumentText(str2) {
        return str2;
      }
      styleSubcommandText(str2) {
        return str2;
      }
      styleCommandText(str2) {
        return str2;
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
       *
       * @param {string} str
       * @returns {boolean}
       */
      preformatted(str2) {
        return /\n[^\S\r\n]/.test(str2);
      }
      /**
       * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
       *
       * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
       *   TTT  DDD DDDD
       *        DD DDD
       *
       * @param {string} term
       * @param {number} termWidth
       * @param {string} description
       * @param {Help} helper
       * @returns {string}
       */
      formatItem(term, termWidth, description, helper) {
        const itemIndent = 2;
        const itemIndentStr = " ".repeat(itemIndent);
        if (!description) return itemIndentStr + term;
        const paddedTerm = term.padEnd(
          termWidth + term.length - helper.displayWidth(term)
        );
        const spacerWidth = 2;
        const helpWidth = this.helpWidth ?? 80;
        const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
        let formattedDescription;
        if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
          formattedDescription = description;
        } else {
          const wrappedDescription = helper.boxWrap(description, remainingWidth);
          formattedDescription = wrappedDescription.replace(
            /\n/g,
            "\n" + " ".repeat(termWidth + spacerWidth)
          );
        }
        return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
      }
      /**
       * Wrap a string at whitespace, preserving existing line breaks.
       * Wrapping is skipped if the width is less than `minWidthToWrap`.
       *
       * @param {string} str
       * @param {number} width
       * @returns {string}
       */
      boxWrap(str2, width) {
        if (width < this.minWidthToWrap) return str2;
        const rawLines = str2.split(/\r\n|\n/);
        const chunkPattern = /[\s]*[^\s]+/g;
        const wrappedLines = [];
        rawLines.forEach((line) => {
          const chunks = line.match(chunkPattern);
          if (chunks === null) {
            wrappedLines.push("");
            return;
          }
          let sumChunks = [chunks.shift()];
          let sumWidth = this.displayWidth(sumChunks[0]);
          chunks.forEach((chunk) => {
            const visibleWidth = this.displayWidth(chunk);
            if (sumWidth + visibleWidth <= width) {
              sumChunks.push(chunk);
              sumWidth += visibleWidth;
              return;
            }
            wrappedLines.push(sumChunks.join(""));
            const nextChunk = chunk.trimStart();
            sumChunks = [nextChunk];
            sumWidth = this.displayWidth(nextChunk);
          });
          wrappedLines.push(sumChunks.join(""));
        });
        return wrappedLines.join("\n");
      }
    };
    function stripColor(str2) {
      const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
      return str2.replace(sgrPattern, "");
    }
    exports.Help = Help2;
    exports.stripColor = stripColor;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
        this.helpGroupHeading = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _collectValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        previous.push(value);
        return previous;
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._collectValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as an object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        if (this.negate) {
          return camelcase(this.name().replace(/^no-/, ""));
        }
        return camelcase(this.name());
      }
      /**
       * Set the help group heading.
       *
       * @param {string} heading
       * @return {Option}
       */
      helpGroup(heading) {
        this.helpGroupHeading = heading;
        return this;
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str2) {
      return str2.split("-").reduce((str3, word) => {
        return str3 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const shortFlagExp = /^-[^-]$/;
      const longFlagExp = /^--[^-]/;
      const flagParts = flags.split(/[ |,]+/).concat("guard");
      if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
      if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
      if (!shortFlag && shortFlagExp.test(flagParts[0]))
        shortFlag = flagParts.shift();
      if (!shortFlag && longFlagExp.test(flagParts[0])) {
        shortFlag = longFlag;
        longFlag = flagParts.shift();
      }
      if (flagParts[0].startsWith("-")) {
        const unsupportedFlag = flagParts[0];
        const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
        if (/^-[^-][^-]/.test(unsupportedFlag))
          throw new Error(
            `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
          );
        if (shortFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many short flags`);
        if (longFlagExp.test(unsupportedFlag))
          throw new Error(`${baseError}
- too many long flags`);
        throw new Error(`${baseError}
- unrecognised flag format`);
      }
      if (shortFlag === void 0 && longFlag === void 0)
        throw new Error(
          `option creation failed due to no flags found in '${flags}'.`
        );
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports) {
    var EventEmitter = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path2 = __require("node:path");
    var fs = __require("node:fs");
    var process2 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2, stripColor } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = false;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._savedState = null;
        this._outputConfiguration = {
          writeOut: (str2) => process2.stdout.write(str2),
          writeErr: (str2) => process2.stderr.write(str2),
          outputError: (str2, write) => write(str2),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
          getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
          stripColor: (str2) => stripColor(str2)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
        this._helpGroupHeading = void 0;
        this._defaultCommandGroup = void 0;
        this._defaultOptionGroup = void 0;
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // change how output being written, defaults to stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // change how output being written for errors, defaults to writeErr
       *     outputError(str, write) // used for displaying errors and not used for displaying help
       *     // specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // color support, currently only used with Help
       *     getOutHasColors()
       *     getErrHasColors()
       *     stripColor() // used to remove ANSI escape codes if output does not have colors
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        this._outputConfiguration = {
          ...this._outputConfiguration,
          ...configuration
        };
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom argument processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, parseArg, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof parseArg === "function") {
          argument.default(defaultValue).argParser(parseArg);
        } else {
          argument.default(parseArg);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument?.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          if (enableOrNameAndArgs && this._defaultCommandGroup) {
            this._initCommandGroup(this._getHelpCommand());
          }
          return this;
        }
        const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        this._initCommandGroup(helpCommand);
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this._initOptionGroup(option);
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this._initCommandGroup(command);
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._collectValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        this._prepareForParse();
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      _prepareForParse() {
        if (this._savedState === null) {
          this.saveStateBeforeParse();
        } else {
          this.restoreStateBeforeParse();
        }
      }
      /**
       * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state saved.
       */
      saveStateBeforeParse() {
        this._savedState = {
          // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
          _name: this._name,
          // option values before parse have default values (including false for negated options)
          // shallow clones
          _optionValues: { ...this._optionValues },
          _optionValueSources: { ...this._optionValueSources }
        };
      }
      /**
       * Restore state before parse for calls after the first.
       * Not usually called directly, but available for subclasses to save their custom state.
       *
       * This is called in a lazy way. Only commands used in parsing chain will have state restored.
       */
      restoreStateBeforeParse() {
        if (this._storeOptionsAsProperties)
          throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
        this._name = this._savedState._name;
        this._scriptPath = null;
        this.rawArgs = [];
        this._optionValues = { ...this._savedState._optionValues };
        this._optionValueSources = { ...this._savedState._optionValueSources };
        this.args = [];
        this.processedArgs = [];
      }
      /**
       * Throw if expected executable is missing. Add lots of help for author.
       *
       * @param {string} executableFile
       * @param {string} executableDir
       * @param {string} subcommandName
       */
      _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
        if (fs.existsSync(executableFile)) return;
        const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path2.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path2.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path2.resolve(
            path2.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path2.basename(
              this._scriptPath,
              path2.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path2.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          this._checkForMissingExecutable(
            executableFile,
            executableDir,
            subcommand._name
          );
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            this._checkForMissingExecutable(
              executableFile,
              executableDir,
              subcommand._name
            );
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        subCommand._prepareForParse();
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise?.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent?.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Side effects: modifies command by storing options. Does not reset state if called again.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} args
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(args) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        const negativeNumberArg = (arg) => {
          if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
          return !this._getCommandAndAncestors().some(
            (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
          );
        };
        let activeVariadicOption = null;
        let activeGroup = null;
        let i = 0;
        while (i < args.length || activeGroup) {
          const arg = activeGroup ?? args[i++];
          activeGroup = null;
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args.slice(i));
            break;
          }
          if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args[i++];
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
                  value = args[i++];
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                activeGroup = `-${arg.slice(2)}`;
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              unknown.push(...args.slice(i));
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg, ...args.slice(i));
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg, ...args.slice(i));
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg, ...args.slice(i));
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str2, flags, description) {
        if (str2 === void 0) return this._version;
        this._version = str2;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str2}
`);
          this._exit(0, "commander.version", str2);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str2, argsDescription) {
        if (str2 === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str2;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str2) {
        if (str2 === void 0) return this._summary;
        this._summary = str2;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str2) {
        if (str2 === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str2;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str2) {
        if (str2 === void 0) return this._name;
        this._name = str2;
        return this;
      }
      /**
       * Set/get the help group heading for this subcommand in parent command's help.
       *
       * @param {string} [heading]
       * @return {Command | string}
       */
      helpGroup(heading) {
        if (heading === void 0) return this._helpGroupHeading ?? "";
        this._helpGroupHeading = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for subcommands added to this command.
       * (This does not override a group set directly on the subcommand using .helpGroup().)
       *
       * @example
       * program.commandsGroup('Development Commands:);
       * program.command('watch')...
       * program.command('lint')...
       * ...
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      commandsGroup(heading) {
        if (heading === void 0) return this._defaultCommandGroup ?? "";
        this._defaultCommandGroup = heading;
        return this;
      }
      /**
       * Set/get the default help group heading for options added to this command.
       * (This does not override a group set directly on the option using .helpGroup().)
       *
       * @example
       * program
       *   .optionsGroup('Development Options:')
       *   .option('-d, --debug', 'output extra debugging')
       *   .option('-p, --profile', 'output profiling information')
       *
       * @param {string} [heading]
       * @returns {Command | string}
       */
      optionsGroup(heading) {
        if (heading === void 0) return this._defaultOptionGroup ?? "";
        this._defaultOptionGroup = heading;
        return this;
      }
      /**
       * @param {Option} option
       * @private
       */
      _initOptionGroup(option) {
        if (this._defaultOptionGroup && !option.helpGroupHeading)
          option.helpGroup(this._defaultOptionGroup);
      }
      /**
       * @param {Command} cmd
       * @private
       */
      _initCommandGroup(cmd) {
        if (this._defaultCommandGroup && !cmd.helpGroup())
          cmd.helpGroup(this._defaultCommandGroup);
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path2.basename(filename, path2.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path3) {
        if (path3 === void 0) return this._executableDir;
        this._executableDir = path3;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        const context = this._getOutputContext(contextOptions);
        helper.prepareContext({
          error: context.error,
          helpWidth: context.helpWidth,
          outputHasColors: context.hasColors
        });
        const text = helper.formatHelp(this, helper);
        if (context.hasColors) return text;
        return this._outputConfiguration.stripColor(text);
      }
      /**
       * @typedef HelpContext
       * @type {object}
       * @property {boolean} error
       * @property {number} helpWidth
       * @property {boolean} hasColors
       * @property {function} write - includes stripColor if needed
       *
       * @returns {HelpContext}
       * @private
       */
      _getOutputContext(contextOptions) {
        contextOptions = contextOptions || {};
        const error = !!contextOptions.error;
        let baseWrite;
        let hasColors;
        let helpWidth;
        if (error) {
          baseWrite = (str2) => this._outputConfiguration.writeErr(str2);
          hasColors = this._outputConfiguration.getErrHasColors();
          helpWidth = this._outputConfiguration.getErrHelpWidth();
        } else {
          baseWrite = (str2) => this._outputConfiguration.writeOut(str2);
          hasColors = this._outputConfiguration.getOutHasColors();
          helpWidth = this._outputConfiguration.getOutHelpWidth();
        }
        const write = (str2) => {
          if (!hasColors) str2 = this._outputConfiguration.stripColor(str2);
          return baseWrite(str2);
        };
        return { error, write, hasColors, helpWidth };
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const outputContext = this._getOutputContext(contextOptions);
        const eventContext = {
          error: outputContext.error,
          write: outputContext.write,
          command: this
        };
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
        this.emit("beforeHelp", eventContext);
        let helpInformation = this.helpInformation({ error: outputContext.error });
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        outputContext.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", eventContext);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", eventContext)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            if (this._helpOption === null) this._helpOption = void 0;
            if (this._defaultOptionGroup) {
              this._initOptionGroup(this._getHelpOption());
            }
          } else {
            this._helpOption = null;
          }
          return this;
        }
        this._helpOption = this.createOption(
          flags ?? "-h, --help",
          description ?? "display help for command"
        );
        if (flags || description) this._initOptionGroup(this._helpOption);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        this._initOptionGroup(option);
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = Number(process2.exitCode ?? 0);
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * // Do a little typing to coordinate emit and listener for the help text events.
       * @typedef HelpTextEventContext
       * @type {object}
       * @property {boolean} error
       * @property {Command} command
       * @property {function} write
       */
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    function useColor() {
      if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
        return false;
      if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== void 0)
        return true;
      return void 0;
    }
    exports.Command = Command2;
    exports.useColor = useColor;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// dist/cli.js
import { randomUUID } from "node:crypto";

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// dist/errors.js
var EXIT_CODES = {
  OK: 0,
  GENERAL: 1,
  VALIDATION: 2,
  CONFIG: 3,
  AUTH: 4,
  API: 5,
  NETWORK: 6,
  THREE_DS: 7
};
var CliError = class extends Error {
  type;
  exitCode;
  code;
  constructor(type, message, exitCode, code) {
    super(message);
    this.name = "CliError";
    this.type = type;
    this.exitCode = exitCode;
    this.code = code ?? exitCode;
  }
};
function validationError(message) {
  return new CliError("validation_error", message, EXIT_CODES.VALIDATION);
}
function configError(message) {
  return new CliError("config_error", message, EXIT_CODES.CONFIG);
}
function authError(message, code = 401) {
  return new CliError("auth_error", message, EXIT_CODES.AUTH, code);
}
function apiError(message, code = 400) {
  return new CliError("api_error", message, EXIT_CODES.API, code);
}
function networkError(message) {
  return new CliError("network_error", message, EXIT_CODES.NETWORK);
}

// dist/args.js
var OPTION_DEFINITIONS = [
  { name: "help", flags: "-h, --help" },
  { name: "format", flags: "--format <format>" },
  { name: "dry-run", flags: "--dry-run" },
  { name: "open", flags: "--open" },
  { name: "base-url", flags: "--base-url <url>" },
  { name: "customer-id", flags: "--customer-id <id>" },
  { name: "customer-api-key", flags: "--customer-api-key <key>" },
  { name: "timeout", flags: "--timeout <ms>" },
  { name: "email", flags: "--email <email>" },
  { name: "name", flags: "--name <name>" },
  { name: "source", flags: "--source <value>" },
  { name: "payment-instrument-id", flags: "--payment-instrument-id <id>" },
  { name: "idempotency-key", flags: "--idempotency-key <key>" },
  { name: "checkout-id", flags: "--checkout-id <id>" },
  { name: "merchant-url", flags: "--merchant-url <url>" },
  { name: "merchant-name", flags: "--merchant-name <name>" },
  { name: "merchant-category-code", flags: "--merchant-category-code <code>" },
  { name: "order-channel-id", flags: "--order-channel-id <id>" },
  { name: "line-items", flags: "--line-items <json>" },
  { name: "buyer", flags: "--buyer <json>" },
  { name: "metadata", flags: "--metadata <json>" },
  { name: "credential-token", flags: "--credential-token <token>" },
  { name: "merchant-id", flags: "--merchant-id <id>" },
  { name: "amount", flags: "--amount <amount>" },
  { name: "currency", flags: "--currency <currency>" },
  { name: "instruction-id", flags: "--instruction-id <id>" },
  { name: "mandate-id", flags: "--mandate-id <id>" },
  { name: "session-id", flags: "--session-id <id>" },
  { name: "payment-method-type", flags: "--payment-method-type <type>" },
  { name: "order-id", flags: "--order-id <id>" },
  { name: "refund-id", flags: "--refund-id <id>" },
  { name: "purchase-instruction-id", flags: "--purchase-instruction-id <id>" },
  { name: "status", flags: "--status <status>" },
  { name: "valid-only", flags: "--valid-only" },
  { name: "title", flags: "--title <title>" },
  { name: "description", flags: "--description <text>" },
  { name: "effective-until-time", flags: "--effective-until-time <datetime>" },
  { name: "mandates", flags: "--mandates <json>" },
  { name: "products", flags: "--products <json>" },
  { name: "is-recurring", flags: "--is-recurring" },
  { name: "shipping-address", flags: "--shipping-address <json>" },
  { name: "sandbox", flags: "--sandbox" },
  { name: "extra", flags: "--extra <json>" },
  { name: "max-wait", flags: "--max-wait <seconds>" },
  { name: "limit", flags: "--limit <n>" },
  { name: "type", flags: "--type <eventType>" },
  { name: "url", flags: "--url <url>" }
];
function parseArgs(argv) {
  const preFlags = {};
  const forwarded = [];
  for (const token of argv) {
    if (token === "--no-watch") {
      preFlags["no-watch"] = true;
      continue;
    }
    if (token === "--watch") {
      preFlags.watch = true;
      continue;
    }
    if (token === "--no-ack") {
      preFlags["no-ack"] = true;
      continue;
    }
    forwarded.push(token);
  }
  const parser = new Command().helpOption(false).allowUnknownOption(true);
  for (const option of OPTION_DEFINITIONS) {
    parser.option(option.flags);
  }
  const { operands, unknown } = parser.parseOptions(forwarded);
  const unknownOption = unknown.find((token) => token.startsWith("-"));
  if (unknownOption) {
    throw validationError(`unknown option: ${unknownOption}`);
  }
  const parsedOptions = parser.opts();
  const flags = { ...preFlags };
  for (const option of OPTION_DEFINITIONS) {
    const value = parsedOptions[toCommanderOptionName(option.name)];
    if (value === void 0 || value === false) {
      continue;
    }
    flags[option.name] = value;
  }
  return { positionals: [...operands, ...unknown], flags };
}
function getStringFlag(flags, ...names) {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "string") {
      return value;
    }
  }
  return void 0;
}
function getBooleanFlag(flags, ...names) {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return value === "true";
    }
  }
  return false;
}
function requireStringFlag(flags, message, ...names) {
  const value = getStringFlag(flags, ...names);
  if (!value) {
    throw validationError(message);
  }
  return value;
}
function toCommanderOptionName(value) {
  return value.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

// dist/config.js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// dist/domains.js
var API_BASE_URLS = {
  production: "https://api.clinkbill.com",
  sandbox: "https://uat-api.clinkbill.com"
  // sandbox: "https://api.clinkbill.dev"
};
var AGENT_BASE_URLS = {
  sandbox: "https://uat-agent.clinkbill.com",
  production: "https://agent.clinkbill.com"
};
var DEFAULT_BASE_URL = API_BASE_URLS.production;

// dist/config.js
var CONFIG_DIR = path.join(os.homedir(), ".clink-cli");
var CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
function defaultConfig() {
  return {
    baseUrl: DEFAULT_BASE_URL,
    defaultOpenLinks: false
  };
}
async function readStoredConfig() {
  try {
    const content = await readFile(CONFIG_PATH, "utf8");
    return normalizeStoredConfig(JSON.parse(content));
  } catch (error) {
    if (error.code === "ENOENT") {
      return defaultConfig();
    }
    throw configError(`failed to read config file: ${error.message}`);
  }
}
async function writeStoredConfig(config) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}
`, "utf8");
}
function resolveRuntimeConfig(storedConfig, flags) {
  const envConfig = compactDefined({
    customerId: process.env.CLINK_CUSTOMER_ID,
    customerApiKey: process.env.CLINK_CUSTOMER_API_KEY
  });
  const flagConfig = compactDefined({
    customerId: getStringFlag(flags, "customer-id"),
    customerApiKey: getStringFlag(flags, "customer-api-key")
  });
  const resolved = {
    ...storedConfig,
    ...envConfig,
    ...flagConfig
  };
  const runtimeConfig = {
    // Base URL precedence: explicit --base-url / CLINK_BASE_URL win; otherwise --sandbox selects the
    // sandbox API host (so one flag switches both the API base and the agent domain); otherwise the
    // stored/default (production) base URL.
    baseUrl: getStringFlag(flags, "base-url") ?? process.env.CLINK_BASE_URL ?? (getBooleanFlag(flags, "sandbox") ? API_BASE_URLS.sandbox : storedConfig.baseUrl),
    defaultOpenLinks: storedConfig.defaultOpenLinks
  };
  assignIfDefined(runtimeConfig, "customerId", resolved.customerId);
  assignIfDefined(runtimeConfig, "customerApiKey", resolved.customerApiKey);
  assignIfDefined(runtimeConfig, "email", resolved.email);
  assignIfDefined(runtimeConfig, "name", resolved.name);
  return runtimeConfig;
}
function normalizeConfigKey(rawKey) {
  const key = rawKey.trim();
  switch (key) {
    case "base-url":
    case "baseUrl":
      return "baseUrl";
    case "customer-id":
    case "customerId":
      return "customerId";
    case "customer-api-key":
    case "customerApiKey":
      return "customerApiKey";
    case "default-open-links":
    case "defaultOpenLinks":
      return "defaultOpenLinks";
    case "email":
      return "email";
    case "name":
      return "name";
    default:
      throw configError(`unsupported config key: ${rawKey}`);
  }
}
function parseConfigValue(key, rawValue) {
  if (key === "defaultOpenLinks") {
    if (rawValue !== "true" && rawValue !== "false") {
      throw configError("defaultOpenLinks must be true or false");
    }
    return rawValue === "true";
  }
  return rawValue;
}
function resolveOpenFlag(storedConfig, flags) {
  if (flags.open !== void 0) {
    return getBooleanFlag(flags, "open");
  }
  return storedConfig.defaultOpenLinks;
}
function isCustomerConfigKey(key) {
  return key === "customerId" || key === "customerApiKey" || key === "email" || key === "name";
}
function cloneStoredConfig(config) {
  return {
    ...config,
    baseUrl: config.baseUrl,
    defaultOpenLinks: config.defaultOpenLinks,
    ...config.paymentMethods ? { paymentMethods: config.paymentMethods.map((item) => ({ ...item })) } : {},
    ...config.riskRules ? { riskRules: config.riskRules.map((item) => ({ ...item })) } : {}
  };
}
function normalizeStoredConfig(raw) {
  const config = defaultConfig();
  if (typeof raw !== "object" || raw === null) {
    return config;
  }
  const record = raw;
  if (typeof record.baseUrl === "string" && record.baseUrl.length > 0) {
    config.baseUrl = record.baseUrl;
  }
  if (typeof record.defaultOpenLinks === "boolean") {
    config.defaultOpenLinks = record.defaultOpenLinks;
  }
  assignStoredCustomerState(config, parseStoredCustomerState(record));
  return config;
}
function parseStoredCustomerState(raw) {
  const customer = {};
  if (typeof raw !== "object" || raw === null) {
    return customer;
  }
  const record = raw;
  assignCustomerString(customer, "customerId", record.customerId);
  assignCustomerString(customer, "customerApiKey", record.customerApiKey ?? record.customerAPIKey);
  assignCustomerString(customer, "email", record.email);
  assignCustomerString(customer, "name", record.name);
  assignPaymentMethods(customer, record.paymentMethods);
  assignRiskRules(customer, record.riskRules);
  return customer;
}
function assignStoredCustomerState(target, value) {
  assignIfDefined(target, "customerId", value.customerId);
  assignIfDefined(target, "customerApiKey", value.customerApiKey);
  assignIfDefined(target, "email", value.email);
  assignIfDefined(target, "name", value.name);
  if (value.paymentMethods) {
    target.paymentMethods = value.paymentMethods.map((item) => ({ ...item }));
  }
  if (value.riskRules) {
    target.riskRules = value.riskRules.map((item) => ({ ...item }));
  }
}
function compactDefined(value) {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== void 0));
}
function assignIfDefined(target, key, value) {
  if (value !== void 0) {
    target[key] = value;
  }
}
function assignCustomerString(target, key, value) {
  if (typeof value === "string" && value.length > 0) {
    target[key] = value;
  }
}
function assignPaymentMethods(target, value) {
  if (!Array.isArray(value)) {
    return;
  }
  const paymentMethods = value.filter((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const paymentInstrumentId = item.paymentInstrumentId;
    return typeof paymentInstrumentId === "string" && paymentInstrumentId.length > 0;
  }).map((item) => ({ ...item }));
  if (paymentMethods.length > 0) {
    target.paymentMethods = paymentMethods;
  }
}
function assignRiskRules(target, value) {
  if (!Array.isArray(value)) {
    return;
  }
  const riskRules = value.filter((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const customerId = item.customerId;
    return typeof customerId === "string" && customerId.length > 0;
  }).map((item) => ({ ...item }));
  if (riskRules.length > 0) {
    target.riskRules = riskRules;
  }
}

// dist/http.js
async function requestJson(options) {
  const url = new URL(options.path, ensureTrailingSlash(options.baseUrl));
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== void 0) {
      url.searchParams.set(key, String(value));
    }
  }
  const headers = {
    Accept: "application/json",
    "Accept-Language": "en-US",
    ...options.headers ?? {}
  };
  if (options.body !== void 0) {
    headers["Content-Type"] = "application/json";
  }
  if (options.dryRun) {
    return {
      dryRun: true,
      request: {
        method: options.method,
        url: url.toString(),
        // Redact credential headers: --dry-run is meant to show request shape, and its output lands
        // in logs / CI / shell history. The CLI never echoes customerApiKey elsewhere (see cli.ts).
        headers: redactSensitiveHeaders(headers),
        body: options.body
      }
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const init = {
      method: options.method,
      headers,
      signal: controller.signal
    };
    if (options.body !== void 0) {
      init.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, init);
    const rawText = await response.text();
    const body = parseBody(rawText);
    return {
      status: response.status,
      url: response.url,
      body
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw networkError(`request timed out after ${options.timeoutMs}ms`);
    }
    throw networkError(error.message);
  } finally {
    clearTimeout(timeout);
  }
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
var SENSITIVE_HEADERS = /* @__PURE__ */ new Set(["x-customer-api-key", "authorization"]);
function redactSensitiveHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => SENSITIVE_HEADERS.has(key.toLowerCase()) && value ? [key, "***"] : [key, value]));
}
function parseBody(rawText) {
  if (!rawText) {
    return {};
  }
  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

// dist/utils.js
import { spawn } from "node:child_process";
function buildCustomerHeaders(config) {
  if (!config.customerId) {
    throw configError("missing customerId; run `clink-cli wallet init` or pass --customer-id");
  }
  if (!config.customerApiKey) {
    throw configError("missing customerApiKey; run `clink-cli wallet init` or pass --customer-api-key");
  }
  return {
    "X-Customer-ID": config.customerId,
    "X-Customer-API-Key": config.customerApiKey,
    "X-Timestamp": Date.now().toString()
  };
}
function buildCustomerApiKeyHeaders(config) {
  if (!config.customerApiKey) {
    throw configError("missing customerApiKey; run `clink-cli wallet init` or pass --customer-api-key");
  }
  return {
    "X-Customer-API-Key": config.customerApiKey,
    "X-Timestamp": Date.now().toString()
  };
}
function buildInstructionHeaders(config) {
  return buildCustomerApiKeyHeaders(config);
}
function buildBareDomainUrl(bindingUrl) {
  return new URL(bindingUrl).origin;
}
function resolveAgentBaseUrl(apiBaseUrl) {
  try {
    const url = new URL(apiBaseUrl);
    if (url.origin === API_BASE_URLS.sandbox) {
      return AGENT_BASE_URLS.sandbox;
    }
    if (url.origin === API_BASE_URLS.production) {
      return AGENT_BASE_URLS.production;
    }
    const segments = url.hostname.split(".");
    const first = segments[0] ?? "";
    if (/(^|-)api$/i.test(first)) {
      segments[0] = first.replace(/(^|-)api$/i, "$1agent");
      url.hostname = segments.join(".");
      return url.origin;
    }
  } catch {
  }
  return AGENT_BASE_URLS.production;
}
function buildAgentPasskeyUrl(agentBaseUrl, paymentInstrumentId, instructionId) {
  const url = new URL(`/passkey-auth/${encodeURIComponent(paymentInstrumentId)}`, agentBaseUrl);
  url.searchParams.set("type", "visa");
  if (instructionId) {
    url.searchParams.set("instructionId", instructionId);
  }
  return url.toString();
}
function maybeOpenBrowser(open, url) {
  if (!open) {
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}
function parseJsonFlag(value, flagName) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw apiError(`invalid JSON for ${flagName}: ${error.message}`);
  }
}
function unwrapApiData(body) {
  if (typeof body === "object" && body !== null && "data" in body) {
    return body.data;
  }
  return body;
}
function assertApiSuccess(status, body) {
  if (status === 401 || status === 403) {
    throw authError(extractMessage(body) ?? `request failed with status ${status}`, status);
  }
  if (status < 200 || status >= 300) {
    throw apiError(extractMessage(body) ?? `request failed with status ${status}`, status);
  }
  if (typeof body === "object" && body !== null && "code" in body) {
    const code = Number(body.code);
    if (!Number.isNaN(code) && code !== 200) {
      if (code === 401 || code === 403) {
        throw authError(extractMessage(body) ?? `request failed with code ${code}`, code);
      }
      throw apiError(extractMessage(body) ?? `request failed with code ${code}`, code);
    }
  }
}
function extractMessage(body) {
  if (typeof body !== "object" || body === null) {
    return void 0;
  }
  const candidate = body.message ?? body.msg ?? body.error;
  if (typeof candidate === "string") {
    return sanitizeApiMessage(candidate);
  }
  const messages = body.messages;
  if (Array.isArray(messages)) {
    for (const item of messages) {
      if (typeof item === "string") {
        return sanitizeApiMessage(item);
      }
      if (typeof item !== "object" || item === null) {
        continue;
      }
      const messageContent = item.content ?? item.message ?? item.msg;
      if (typeof messageContent === "string") {
        return sanitizeApiMessage(messageContent);
      }
    }
  }
  return void 0;
}
function sanitizeApiMessage(message) {
  const trimmed = message.trim();
  if (!hasInternalServiceDiagnostics(trimmed)) {
    return trimmed;
  }
  const publicPrefix = extractPublicErrorPrefix(trimmed);
  const publicReason = /timeout|timed out/i.test(trimmed) ? "downstream service timeout" : "downstream service invocation failed";
  return publicPrefix ? `${publicPrefix}: ${publicReason}` : publicReason;
}
function hasInternalServiceDiagnostics(message) {
  return [
    /org\.apache\.dubbo/i,
    /DefaultServiceInstance/i,
    /GenericService/i,
    /from the registry/i,
    /\bproviders?\s+\[[^\]]+\]/i,
    /\bconsumer\s+\d{1,3}(?:\.\d{1,3}){3}/i,
    /\bprovider\.application\b/i,
    /\bservice\{name=/i,
    /Failed to invoke the method/i
  ].some((pattern) => pattern.test(message));
}
function extractPublicErrorPrefix(message) {
  const markerIndexes = [
    "Failed to invoke the method",
    "org.apache.dubbo",
    "DefaultServiceInstance",
    "GenericService",
    "from the registry",
    "Tried 1 times of the providers"
  ].map((marker) => message.indexOf(marker)).filter((index) => index > 0);
  const firstMarkerIndex = markerIndexes.length > 0 ? Math.min(...markerIndexes) : -1;
  if (firstMarkerIndex <= 0) {
    return void 0;
  }
  const prefix = message.slice(0, firstMarkerIndex).replace(/[\s:：,，.。]+$/u, "").trim();
  return prefix.length > 0 ? prefix : void 0;
}
function pickDefaultPaymentInstrument(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw configError("no payment methods available; pass --payment-instrument-id explicitly");
  }
  const preferred = items.find((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const record = item;
    return record.isDefault === true || record.default === true || record.defaultPaymentMethod === true;
  }) ?? items[0];
  if (typeof preferred !== "object" || preferred === null) {
    throw configError("unable to resolve default payment method");
  }
  const paymentInstrumentId = preferred.paymentInstrumentId;
  if (typeof paymentInstrumentId !== "string" || paymentInstrumentId.length === 0) {
    throw configError("unable to resolve paymentInstrumentId from default card");
  }
  return paymentInstrumentId;
}

// dist/events.js
var EVENT_POLL_PATH = "/agent/event-hub/webhook-events/poll";
var EVENT_ACK_PATH = "/agent/event-hub/webhook-events/ack";
var DEFAULT_POLL_INTERVAL_MS = 5e3;
var DEFAULT_MAX_DURATION_MS = 15 * 6e4;
var DEFAULT_PAGE_SIZE = 20;
var DEFAULT_COLLECT_POLL_INTERVAL_MS = 2e3;
var DEFAULT_COLLECT_MAX_DURATION_MS = 6e4;
var KNOWN_EVENT_TYPES = /* @__PURE__ */ new Set([
  "agent_order.succeeded",
  "agent_order.failed",
  "agent_order.created",
  "agent_refund.succeeded",
  "agent_refund.failed",
  "agent_refund.rejected",
  "agent_refund.approved",
  "payment_method.added",
  // Backend `VtsAppService` currently publishes `payment_method.update` (no trailing "d"); accept
  // both spellings so card-change summaries survive a future rename to `payment_method.updated`.
  "payment_method.update",
  "payment_method.updated",
  "payment_method.delete",
  "payment_method.deleted",
  "payment_method.default_change",
  "risk_rule.updated",
  // UCP/VIC purchase-instruction + device events. These have NO producer in the backend codebase
  // yet; the type names and `data` field names below are provisional and must be reconciled with
  // the UCP event contract before it ships.
  "vic_device.binding_succeeded",
  "purchase_instruction.created",
  "purchase_instruction.activated",
  "purchase_instruction.updated",
  "purchase_instruction.cancelled"
]);
var realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var stderrLog = (message) => {
  process.stderr.write(`\u2022 ${message}
`);
};
async function pollWebhookEvents(options) {
  const result = await requestJson({
    baseUrl: options.runtimeConfig.baseUrl,
    method: "POST",
    path: EVENT_POLL_PATH,
    headers: buildInstructionHeaders(options.runtimeConfig),
    body: { pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE },
    timeoutMs: options.timeoutMs,
    dryRun: false
  });
  if ("dryRun" in result) {
    return [];
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  const records = data?.records;
  if (!Array.isArray(records)) {
    return [];
  }
  return records.filter(isWebhookEventRecord);
}
async function ackWebhookEvents(options, eventIds) {
  if (eventIds.length === 0) {
    return;
  }
  const result = await requestJson({
    baseUrl: options.runtimeConfig.baseUrl,
    method: "POST",
    path: EVENT_ACK_PATH,
    headers: buildInstructionHeaders(options.runtimeConfig),
    body: { eventIds },
    timeoutMs: options.timeoutMs,
    dryRun: false
  });
  if ("dryRun" in result) {
    return;
  }
  assertApiSuccess(result.status, result.body);
}
async function watchEvents(options) {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const sleep = options.sleep ?? realSleep;
  const now = options.now ?? Date.now;
  const log = options.log ?? stderrLog;
  const startedAtMs = now();
  log(`Open this link in your browser to complete the ${options.label}:`);
  log(`  ${options.url}`);
  log(`Waiting for events (polling every ${Math.round(pollIntervalMs / 1e3)}s, up to ${Math.round(maxDurationMs / 6e4)} min). This will continue automatically once an event arrives.`);
  const deadline = startedAtMs + maxDurationMs;
  for (; ; ) {
    let records;
    try {
      records = await pollWebhookEvents({
        runtimeConfig: options.runtimeConfig,
        timeoutMs: options.timeoutMs,
        ...options.pageSize !== void 0 ? { pageSize: options.pageSize } : {}
      });
    } catch (error) {
      if (!isRecoverableWatchPollError(error)) {
        throw error;
      }
      if (now() + pollIntervalMs >= deadline) {
        break;
      }
      await sleep(pollIntervalMs);
      continue;
    }
    if (records.length > 0) {
      const staleRecords = records.filter((record) => isStaleForWatch(record, startedAtMs));
      const currentRecords = records.filter((record) => !isStaleForWatch(record, startedAtMs));
      const staleEventIds = staleRecords.map((record) => record.eventId).filter((id) => id.length > 0);
      if (staleEventIds.length > 0) {
        await ackWebhookEvents({ runtimeConfig: options.runtimeConfig, timeoutMs: options.timeoutMs }, staleEventIds);
        log(`Ignored ${staleEventIds.length} stale event(s) from before the watch started.`);
      }
      if (currentRecords.length === 0) {
        if (now() + pollIntervalMs >= deadline) {
          break;
        }
        await sleep(pollIntervalMs);
        continue;
      }
      const events = await processEvents(currentRecords);
      log(`Received ${events.length} event(s):`);
      for (const event of events) {
        log(`  ${event.summary}`);
      }
      const ackedEventIds = events.map((event) => event.eventId).filter((id) => id.length > 0);
      await ackWebhookEvents({ runtimeConfig: options.runtimeConfig, timeoutMs: options.timeoutMs }, ackedEventIds);
      log(`Acknowledged ${ackedEventIds.length} event(s).`);
      return { watched: true, url: options.url, timedOut: false, events, ackedEventIds };
    }
    if (now() + pollIntervalMs >= deadline) {
      break;
    }
    await sleep(pollIntervalMs);
  }
  log(`Timed out after ${Math.round(maxDurationMs / 6e4)} min without receiving any events.`);
  return { watched: true, url: options.url, timedOut: true, events: [], ackedEventIds: [] };
}
function isStaleForWatch(record, startedAtMs) {
  const eventTimeMs = parseEventTimeMs(record.eventTime);
  return eventTimeMs !== void 0 && eventTimeMs <= startedAtMs;
}
function parseEventTimeMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeEpochMs(value);
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  if (/^\d+$/.test(trimmed)) {
    return normalizeEpochMs(Number(trimmed));
  }
  const utcDateTime = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(trimmed);
  if (utcDateTime) {
    const [, year, month, day, hour, minute, second, millisecond = "0"] = utcDateTime;
    return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(millisecond.padEnd(3, "0")));
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function normalizeEpochMs(value) {
  return value < 1e12 ? value * 1e3 : value;
}
function isRecoverableWatchPollError(error) {
  return error instanceof CliError && (error.type === "network_error" || error.type === "api_error" && error.code === 429);
}
async function collectWebhookEvents(options) {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_COLLECT_POLL_INTERVAL_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_COLLECT_MAX_DURATION_MS;
  const ack = options.ack ?? true;
  const sleep = options.sleep ?? realSleep;
  const now = options.now ?? Date.now;
  const collected = [];
  const ackedEventIds = [];
  const targetReached = () => options.type ? collected.some((event) => event.eventType === options.type) : collected.length > 0;
  const deadline = now() + maxDurationMs;
  for (; ; ) {
    const records = await pollWebhookEvents({
      runtimeConfig: options.runtimeConfig,
      timeoutMs: options.timeoutMs,
      ...options.pageSize !== void 0 ? { pageSize: options.pageSize } : {}
    });
    if (records.length > 0) {
      const events = await processEvents(records);
      collected.push(...events);
      if (ack) {
        const ackable = options.type ? events.filter((event) => event.eventType === options.type) : events;
        const ids = ackable.map((event) => event.eventId).filter((id) => id.length > 0);
        await ackWebhookEvents({ runtimeConfig: options.runtimeConfig, timeoutMs: options.timeoutMs }, ids);
        ackedEventIds.push(...ids);
      }
      if (targetReached()) {
        return { ready: true, timedOut: false, events: collected, ackedEventIds };
      }
    }
    if (now() + pollIntervalMs >= deadline) {
      break;
    }
    await sleep(pollIntervalMs);
  }
  return { ready: false, timedOut: true, events: collected, ackedEventIds };
}
async function processEvents(records) {
  const stored = await readStoredConfig();
  const nextConfig = cloneStoredConfig(stored);
  const events = records.map((record) => {
    const event = toProcessedEvent(record);
    applyEventToConfig(nextConfig, event);
    return event;
  });
  await writeStoredConfig(nextConfig);
  return events;
}
function toProcessedEvent(record) {
  const data = parsePayloadData(record.payload);
  return {
    eventId: record.eventId,
    eventType: record.eventType,
    ...record.customerId ? { customerId: record.customerId } : {},
    ...record.resourceId ? { resourceId: record.resourceId } : {},
    ...record.businessStatus ? { businessStatus: record.businessStatus } : {},
    ...record.eventTime ? { eventTime: record.eventTime } : {},
    known: KNOWN_EVENT_TYPES.has(record.eventType),
    summary: summarizeEvent(record, data),
    data
  };
}
function applyEventToConfig(config, event) {
  if (event.eventType.startsWith("payment_method.")) {
    applyPaymentMethodEvent(config.paymentMethods ?? (config.paymentMethods = []), event);
  }
  if (event.eventType === "risk_rule.updated") {
    applyRiskRuleEvent(config.riskRules ?? (config.riskRules = []), event);
  }
}
function applyPaymentMethodEvent(paymentMethods, event) {
  const paymentInstrumentId = asString(event.data.paymentInstrumentId) ?? event.resourceId;
  if (event.eventType === "payment_method.default_change") {
    const defaultId = asString(event.data.defaultPaymentMethodId) ?? paymentInstrumentId;
    for (const method of paymentMethods) {
      method.isDefault = method.paymentInstrumentId === defaultId;
    }
    return;
  }
  if (event.eventType === "payment_method.delete" || event.eventType === "payment_method.deleted") {
    if (!paymentInstrumentId) {
      return;
    }
    const index = paymentMethods.findIndex((method) => method.paymentInstrumentId === paymentInstrumentId);
    if (index >= 0) {
      paymentMethods.splice(index, 1);
    }
    return;
  }
  if (!paymentInstrumentId) {
    return;
  }
  const existing = paymentMethods.find((method) => method.paymentInstrumentId === paymentInstrumentId);
  if (existing) {
    Object.assign(existing, event.data, { paymentInstrumentId });
  } else {
    paymentMethods.push({ ...event.data, paymentInstrumentId });
  }
}
function applyRiskRuleEvent(riskRules, event) {
  const customerId = asString(event.data.customerId) ?? event.resourceId ?? event.customerId;
  if (!customerId) {
    return;
  }
  const nextRiskRule = {
    ...event.data,
    customerId
  };
  const existing = riskRules.find((riskRule) => riskRule.customerId === customerId);
  if (existing) {
    Object.assign(existing, nextRiskRule);
  } else {
    riskRules.push(nextRiskRule);
  }
}
function summarizeEvent(record, data) {
  switch (record.eventType) {
    case "agent_order.succeeded":
      return `order ${str(data, "orderId", record.resourceId)} succeeded${amountSuffix(data)}`;
    case "agent_order.failed":
      return `order ${str(data, "orderId", record.resourceId)} failed${failureSuffix(data)}`;
    case "agent_order.created":
      return `order ${str(data, "orderId", record.resourceId)} created${amountSuffix(data)}`;
    case "agent_refund.succeeded":
      return `refund ${str(data, "refundId", record.resourceId)} succeeded for order ${str(data, "orderId")}`;
    case "agent_refund.failed":
      return `refund ${str(data, "refundId", record.resourceId)} failed${failureSuffix(data)}`;
    case "agent_refund.rejected":
      return `refund ${str(data, "refundId", record.resourceId)} rejected${reasonSuffix(data)}`;
    case "agent_refund.approved":
      return `refund ${str(data, "refundId", record.resourceId)} approved`;
    case "payment_method.added":
      return `payment method ${str(data, "paymentInstrumentId", record.resourceId)} added${cardSuffix(data)}`;
    case "payment_method.update":
    case "payment_method.updated":
      return `payment method ${str(data, "paymentInstrumentId", record.resourceId)} updated${cardSuffix(data)}`;
    case "payment_method.delete":
    case "payment_method.deleted":
      return `payment method ${str(data, "paymentInstrumentId", record.resourceId)} deleted${cardSuffix(data)}`;
    case "payment_method.default_change":
      return `default payment method changed to ${str(data, "defaultPaymentMethodId", str(data, "paymentInstrumentId", record.resourceId))}`;
    case "risk_rule.updated":
      return `risk rules updated for ${str(data, "customerId", record.customerId)}`;
    case "vic_device.binding_succeeded":
      return `VIC device bound for payment method ${str(data, "paymentInstrumentId", record.resourceId)}`;
    case "purchase_instruction.created":
      return `purchase instruction ${str(data, "instructionId", record.resourceId)} created${titleSuffix(data)}`;
    case "purchase_instruction.activated":
      return `purchase instruction ${str(data, "instructionId", record.resourceId)} activated (Passkey/FIDO authorized)`;
    case "purchase_instruction.updated":
      return `purchase instruction ${str(data, "instructionId", record.resourceId)} updated${statusSuffix(data)}`;
    case "purchase_instruction.cancelled":
      return `purchase instruction ${str(data, "instructionId", record.resourceId)} cancelled${reasonSuffix(data)}`;
    default:
      return `received ${record.eventType}${record.resourceId ? ` (${record.resourceId})` : ""}`;
  }
}
function amountSuffix(data) {
  const amount = data.amount;
  const currency = asString(data.currency);
  if (amount === void 0 || amount === null) {
    return "";
  }
  return ` (${String(amount)}${currency ? ` ${currency}` : ""})`;
}
function failureSuffix(data) {
  const code = asString(data.failureCode);
  const message = asString(data.failureMessage);
  if (!code && !message) {
    return "";
  }
  return `: ${[code, message].filter(Boolean).join(" ")}`;
}
function reasonSuffix(data) {
  const reason = asString(data.reason);
  return reason ? `: ${reason}` : "";
}
function statusSuffix(data) {
  const status = asString(data.status);
  return status ? ` (status: ${status})` : "";
}
function titleSuffix(data) {
  const title = asString(data.title);
  return title ? `: ${title}` : "";
}
function cardSuffix(data) {
  const brand = asString(data.cardBrand) ?? asString(data.cardScheme);
  const last4 = asString(data.cardLast4) ?? asString(data.cardLastFour);
  if (!brand && !last4) {
    return "";
  }
  return ` (${[brand, last4 ? `****${last4}` : ""].filter(Boolean).join(" ")})`;
}
function parsePayloadData(payload) {
  if (!payload) {
    return {};
  }
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }
  const record = parsed;
  if (typeof record.data === "object" && record.data !== null) {
    return record.data;
  }
  return record;
}
function isWebhookEventRecord(value) {
  return typeof value === "object" && value !== null && typeof value.eventId === "string" && typeof value.eventType === "string";
}
function str(data, key, fallback) {
  return asString(data[key]) ?? fallback ?? "unknown";
}
function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}

// dist/help.js
var ROOT_HELP = `clink-cli

Clink customer wallet CLI.

Usage:
  clink-cli <command> [subcommand] [options]

Commands:
  wallet            Initialize wallet and inspect local wallet status
  card              Generate card links and manage payment methods
  risk              Inspect or open risk rule settings
  pay               Charge a payment instrument
  refund            Create refund and query refund status
  ucp-checkout      Manage UCP checkout sessions for shadow merchants
  instruction       Manage purchase instruction mandates (agentic authorization)
  events            Poll the webhook-event queue for state-change events
  tool              Utility tools for UCP and checkout workflows
  config            Read and update local config

Global Options:
  --format <json|pretty>        Output format
  --dry-run                     Print request without executing
  --open                        Open generated link in browser
  --no-watch                    Do not poll for webhook events after printing a link
  --base-url <url>              Override API base URL
  --sandbox                     Target the sandbox environment (sandbox API base + agent domain);
                                explicit --base-url / CLINK_BASE_URL still overrides the API host.
  --customer-id <id>            Override customer ID
  --customer-api-key <key>      Override customer API key
  --timeout <ms>                Request timeout in milliseconds
  --help, -h                    Show help

Event Watching:
  After printing a link for the user to open in a browser, the CLI polls
  /agent/event-hub/webhook-events/poll (pageSize=20, every 5s up to 15 min),
  processes the first batch of events (logs to stderr, updates the local cache),
  acknowledges them via /agent/event-hub/webhook-events/ack ({eventIds}), and
  prints the events to stdout. Progress is written to stderr; the events envelope
  is written to stdout. Pass --no-watch to skip polling (for scripted or
  non-interactive use, including card binding-link refreshes). To pull state
  changes on demand without printing a link, use 'clink-cli events poll'
  (see 'clink-cli events --help').

Examples:
  clink-cli wallet init --email user@example.com --name Alice
  clink-cli wallet init --sandbox --email user@example.com --name Alice
  clink-cli wallet status --format pretty
  clink-cli card setup-link --open
  clink-cli pay --merchant-id merchant_xxx --amount 10 --currency USD --payment-instrument-id pi_xxx
  clink-cli ucp-checkout get --checkout-id chk_xxx
  clink-cli tool item-id --url https://shop.example/products/t-shirt?variant=123
  clink-cli refund create --order-id order_xxx

More Help:
  clink-cli wallet --help
  clink-cli card --help
  clink-cli ucp-checkout --help
  clink-cli refund --help
  clink-cli instruction --help
  clink-cli tool --help
  clink-cli config --help
`;
var TOOL_HELP = `clink-cli tool

Usage:
  clink-cli tool item-id --url <url> [options]

Tools:
  item-id   Extract a UCP item_id from a product URL

Examples:
  clink-cli tool item-id --url https://uebmaw-it.myshopify.com/products/t-shirt?variant=45085516365894 --format json
`;
var TOOL_ITEM_ID_HELP = `clink-cli tool item-id

Usage:
  clink-cli tool item-id --url <url> [options]

Arguments:
  --url <url>   Product URL to inspect

Behavior:
  Shopify is detected when the hostname ends with .myshopify.com, or when any CNAME in the chain
  has canonical name shops.myshopify.com. For Shopify URLs, item_id is the variant query parameter.
  Other sites return item_id "unknown".

Examples:
  clink-cli tool item-id --url https://uebmaw-it.myshopify.com/products/t-shirt?variant=45085516365894 --format pretty
`;
var WALLET_HELP = `clink-cli wallet

Usage:
  clink-cli wallet init --email <email> --name <name> [options]
  clink-cli wallet status [options]

Subcommands:
  init         Create or activate a customer wallet and persist credentials locally
  status       Show local wallet configuration without network request

Examples:
  clink-cli wallet init --email user@example.com --name Alice
  clink-cli wallet init --sandbox --email user@example.com --name Alice
  clink-cli wallet status --format pretty
`;
var WALLET_INIT_HELP = `clink-cli wallet init

Usage:
  clink-cli wallet init --email <email> --name <name> [options]

Arguments:
  --email <email>              Customer email used to create or activate the wallet
  --name <name>                Customer display name saved to local config

Options:
  --source <value>             Bootstrap source value, defaults to "agent"

Sandbox:
  --sandbox switches the API/agent environment. Re-running wallet init overwrites the
  single local customer credentials.

Defaults:
  --source                     agent

Examples:
  clink-cli wallet init --email user@example.com --name Alice
  clink-cli wallet init --sandbox --email user@example.com --name Alice
`;
var WALLET_STATUS_HELP = `clink-cli wallet status

Usage:
  clink-cli wallet status [options]

Notes:
  Reads local config only and does not make a network request.

Examples:
  clink-cli wallet status
  clink-cli wallet status --format pretty
`;
var CARD_HELP = `clink-cli card

Usage:
  clink-cli card binding-link [options]
  clink-cli card setup-link [--open] [options]
  clink-cli card modify-link [--open] [options]
  clink-cli card list [options]
  clink-cli card get --payment-instrument-id <id> [options]

Subcommands:
  binding-link   Fetch raw binding link and refresh cached payment methods
  setup-link     Fetch payment method setup link and refresh cached payment methods
  modify-link    Fetch payment method modify link and refresh cached payment methods
  list           List cached payment methods from local config
  get            Get cached payment method detail from local config
`;
var CARD_BINDING_LINK_HELP = `clink-cli card binding-link

Usage:
  clink-cli card binding-link [options]

Options:
  --no-watch                   Skip polling for webhook events after printing the link

Notes:
  Calls /agent/cwallet/card/bindingLink.
  Refreshes local cached payment methods from paymentMethodsVoList.
  After printing the link, polls for webhook events until one arrives (max 15 min);
  pass --no-watch when you only need to refresh the cached card list.

Examples:
  clink-cli card binding-link
  clink-cli card binding-link --no-watch --format pretty
`;
var CARD_SETUP_LINK_HELP = `clink-cli card setup-link

Usage:
  clink-cli card setup-link [--open] [options]

Options:
  --open                       Open the generated setup link in the browser
  --no-watch                   Skip polling for webhook events after printing the link

Notes:
  Derives the add-card page from the binding link response.
  Refreshes local cached payment methods before returning the setup URL.
  After printing the link, polls for webhook events until one arrives (max 15 min); use --no-watch to skip.

Examples:
  clink-cli card setup-link
  clink-cli card setup-link --open
`;
var CARD_MODIFY_LINK_HELP = `clink-cli card modify-link

Usage:
  clink-cli card modify-link [--open] [options]

Options:
  --open                       Open the generated manage-card link in the browser
  --no-watch                   Skip polling for webhook events after printing the link

Notes:
  Derives the manage-card page from the binding link response.
  Refreshes local cached payment methods before returning the modify URL.
  After printing the link, polls for webhook events until one arrives (max 15 min); use --no-watch to skip.

Examples:
  clink-cli card modify-link
  clink-cli card modify-link --open
`;
var CARD_LIST_HELP = `clink-cli card list

Usage:
  clink-cli card list [options]

Notes:
  Reads payment methods from local config only and does not make a network request.

Examples:
  clink-cli card list
  clink-cli card list --format pretty
`;
var CARD_GET_HELP = `clink-cli card get

Usage:
  clink-cli card get --payment-instrument-id <id> [options]

Arguments:
  --payment-instrument-id <id> Payment instrument ID to read from local cached payment methods

Notes:
  Reads payment method detail from local config only and does not make a network request.

Examples:
  clink-cli card get --payment-instrument-id pi_xxx
  clink-cli card get --payment-instrument-id pi_xxx --format pretty
`;
var RISK_RULE_HELP = `clink-cli risk

Usage:
  clink-cli risk get [options]
  clink-cli risk link [--open] [options]

Subcommands:
  get          Fetch current risk rule settings
  link         Print the agent risk-rule setup page URL
`;
var RISK_RULE_GET_HELP = `clink-cli risk get

Usage:
  clink-cli risk get [options]

Notes:
  Calls GET /agent/risk/rule/settings.

Examples:
  clink-cli risk get
  clink-cli risk get --format pretty
`;
var RISK_RULE_LINK_HELP = `clink-cli risk link

Usage:
  clink-cli risk link [--open] [options]

Options:
  --open                       Open the generated risk-rule page in the browser
  --sandbox                    Use the sandbox agent domain (uat-agent.clinkbill.com)
  --no-watch                   Skip polling for webhook events after printing the link

Notes:
  Prints the agent risk-rule setup page at /risk-rules-setup. The agent domain mirrors the
  resolved API environment: production https://agent.clinkbill.com, --sandbox
  https://uat-agent.clinkbill.com, a UAT base (CLINK_BASE_URL/--base-url) https://uat-agent.clinkbill.com.
  No network request.
  After printing the link, polls for webhook events until one arrives (max 15 min); use --no-watch to skip.

Examples:
  clink-cli risk link
  clink-cli risk link --sandbox --open
`;
var PAY_HELP = `clink-cli pay

Usage:
  clink-cli pay --merchant-id <id> --amount <amount> --currency <currency> [--payment-instrument-id <id>] [options]
  clink-cli pay --session-id <id> [--payment-instrument-id <id>] [options]

Arguments:
  --merchant-id <id>           Merchant ID for direct charge mode
  --amount <amount>            Charge amount for direct charge mode
  --currency <currency>        Charge currency for direct charge mode, for example USD
  --session-id <id>            Checkout session ID for session mode
  --payment-instrument-id <id> Payment instrument to charge; defaults to the cached default card
  --instruction-id <id>          VIC purchase instruction ID sent as instruction_id
  --purchase-instruction-id <id> Backward-compatible alias for --instruction-id
  --mandate-id <id>              VIC mandate ID sent as mandate_id
  --shipping-address <json>      UCP Postal Address JSON object sent as shippingaddress
  --products <json>              Product list JSON array for aiAgentInstructionBo.products

Options:
  --payment-method-type <type> Payment method type, defaults to CARD

Notes:
  If --payment-instrument-id is omitted, pay uses the default cached payment method from local config.
  Refresh cached payment methods with clink-cli card binding-link when needed.
  For VIC-routed charge, pass instruction_id and mandate_id via --instruction-id and --mandate-id.
  For shipped physical goods, pass --shipping-address as UCP Postal Address JSON:
  street_address, extended_address, address_locality, address_region, address_country,
  postal_code, first_name, last_name, and phone_number.
  For product-level VIC credential context, pass --products as a JSON array with productId,
  productName, productUrl, quantity, unitPrice, currencyCode, and optional extra.
  Old agent pay always sends aiAgentInstructionBo.merchantInfo.merchantCategoryCode = 5999.

Examples:
  clink-cli pay --merchant-id merchant_xxx --amount 10 --currency USD --payment-instrument-id pi_xxx
  clink-cli pay --session-id sess_xxx --payment-instrument-id pi_xxx
  clink-cli pay --session-id sess_xxx --instruction-id ins_xxx --mandate-id mndt_xxx --shipping-address '{"street_address":"1 Market St","address_locality":"San Francisco","address_region":"CA","address_country":"US","postal_code":"94105","first_name":"Ada","last_name":"Lovelace","phone_number":"+14155550100"}' --products '[{"productId":"sku_1","productName":"Demo","quantity":1,"unitPrice":12.99,"currencyCode":"USD"}]'
`;
var REFUND_HELP = `clink-cli refund

Usage:
  clink-cli refund create --order-id <id> [options]
  clink-cli refund get --refund-id <id> [options]

Subcommands:
  create       Apply full refund for an order
  get          Query refund status
`;
var REFUND_CREATE_HELP = `clink-cli refund create

Usage:
  clink-cli refund create --order-id <id> [options]

Arguments:
  --order-id <id>              Order ID to refund

Notes:
  Applies a full refund for the given order.

Examples:
  clink-cli refund create --order-id order_xxx
  clink-cli refund create --order-id order_xxx --format pretty
`;
var REFUND_GET_HELP = `clink-cli refund get

Usage:
  clink-cli refund get --refund-id <id> [options]

Arguments:
  --refund-id <id>             Refund order ID to query

Examples:
  clink-cli refund get --refund-id rfd_xxx
  clink-cli refund get --refund-id rfd_xxx --format pretty
`;
var UCP_CHECKOUT_HELP = `clink-cli ucp-checkout

Usage:
  clink-cli ucp-checkout <create|get|update|cancel|complete> [options]

Actions:
  create    Create a UCP checkout session for an external/shadow merchant
  get       Fetch one checkout session by --checkout-id
  update    Replace editable checkout fields by --checkout-id
  cancel    Cancel one checkout session by --checkout-id
  complete  Complete checkout with a payment instrument

Arguments:
  --checkout-id <id>              Checkout ID for get/update/cancel/complete
  --merchant-url <url>            External merchant checkout URL for create
  --merchant-name <name>          Optional merchant display name override for create
  --merchant-category-code <code> Merchant category code for create
  --order-channel-id <id>         Optional advanced override; backend derives it from merchant-url
  --currency <currency>           Checkout currency for create, for example USD
  --instruction-id <id>           Purchase instruction ID for create
  --mandate-id <id>               Purchase instruction mandate ID for create
  --line-items <json>             UCP line_items JSON array for create/update
  --buyer <json>                  UCP buyer JSON object for create/update
  --shipping-address <json>       Shipping address JSON object for create/update
  --metadata <json>               Metadata JSON object for create/update
  --payment-instrument-id <id>    Required payment instrument ID for complete
  --idempotency-key <key>         Optional key for create/update/complete; generated when omitted

Notes:
  Calls /agent/ucp/external/checkout-sessions internally because CLI-discovered merchants use the
  shadow-merchant external checkout path by default. The command surface intentionally does not
  expose an "external" mode or subcommand.
  Authenticates by customer API key only (CSK): X-Customer-API-Key and X-Timestamp are sent, and
  X-Customer-ID is not sent.
  create sends merchant_url, instruction_id and mandate_id; backend resolves order_channel_id from
  merchant_url. external complete sends payment_instrument_id only.
  create treats line_items price/amount fields as decimal major-unit values and converts them by
  --currency before calling the external checkout API; update sends line_items JSON unchanged.

Examples:
  clink-cli ucp-checkout create \\
    --merchant-url https://shop.example/checkout/abc \\
    --merchant-category-code 5311 --currency USD \\
    --instruction-id ins_xxx --mandate-id mndt_xxx \\
    --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"10.00"},"quantity":1}]' \\
    --buyer '{"email":"buyer@example.com"}' --format json
  clink-cli ucp-checkout get --checkout-id chk_xxx --format json
  clink-cli ucp-checkout update --checkout-id chk_xxx --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":1200},"quantity":1}]' --format json
  clink-cli ucp-checkout complete --checkout-id chk_xxx --payment-instrument-id pi_xxx --format json
  clink-cli ucp-checkout cancel --checkout-id chk_xxx --format json
`;
var CONFIG_HELP = `clink-cli config

Usage:
  clink-cli config set <key> <value>
  clink-cli config get
  clink-cli config unset <key>

Subcommands:
  set        Update local config
  get        Show local config
  unset      Remove or reset a local config key

Supported Keys:
  base-url
  customer-id
  customer-api-key
  default-open-links
  email
  name

Notes:
  wallet init stores a single local customer. Running wallet init again overwrites customer
  credentials and clears cached payment methods/risk rules for the previous customer.
`;
var CONFIG_SET_HELP = `clink-cli config set

Usage:
  clink-cli config set <key> <value>

Arguments:
  <key>                        Config key to update
  <value>                      Value to save

Supported Keys:
  base-url
  customer-id
  customer-api-key
  default-open-links
  email
  name

Examples:
  clink-cli config set base-url https://api.clinkbill.com
  clink-cli config set customer-id cus_xxx
  clink-cli config set default-open-links true
`;
var CONFIG_GET_HELP = `clink-cli config get

Usage:
  clink-cli config get [options]

Examples:
  clink-cli config get
  clink-cli config get --format pretty
`;
var CONFIG_UNSET_HELP = `clink-cli config unset

Usage:
  clink-cli config unset <key> [options]

Arguments:
  <key>                        Config key to remove or reset

Supported Keys:
  base-url
  customer-id
  customer-api-key
  default-open-links
  email
  name

Examples:
  clink-cli config unset customer-api-key
  clink-cli config unset base-url
`;
var INSTRUCTION_HELP = `clink-cli instruction

Usage:
  clink-cli instruction <create|sign-url|list|get|update|cancel> [options]

Actions:
  create    Create an instruction (CREATED draft) and print the Passkey URL to authorize it
  sign-url  Print the Passkey page URL; the page automatically signs after the user opens it
  list      List instructions, optionally filtered by --status, --valid-only and --payment-instrument-id
  get       Get one instruction by --purchase-instruction-id
  update    Print the agent page URL for user-managed changes; no backend update call in this phase
  cancel    Print the agent page URL for user-managed cancellation; no backend cancel call in this phase

Notes:
  create POSTs /agent/cwallet/instructions and creates the instruction in CREATED (draft) state,
  then prints the Passkey page URL for the returned instructionId.
  An instruction turns ACTIVE only after the Passkey/FIDO signature completes on the agent page
  (that page calls the backend sign API with the WebAuthn authResult). The CLI does not call the
  backend sign/update/cancel APIs itself \u2014 those require a Passkey authResult produced in the
  browser, so sign-url/update/cancel only print the agent page URL for the user to complete there.
  Agent page URL environment mirrors the resolved API base: production https://agent.clinkbill.com,
  --sandbox https://uat-agent.clinkbill.com, UAT https://uat-agent.clinkbill.com.
  Only valid for Visa cards whose card data has visaRegistrationSucceeded = true.
  Instruction-level currency/amount are NOT sent \u2014 currency and amountLimit live on each mandate.
  When --is-recurring is set, every mandate must include recurringFrequency (WEEKLY, MONTHLY, or YEARLY).
  Do not send clientReferenceId / channelTokenId / consumerId \u2014 the server derives them.
  --effective-until-time / mandate effectiveUntilTime use UTC datetime format "yyyy-MM-dd HH:mm:ss".
  --valid-only lists ACTIVE instructions and, for one-time instructions, keeps only mandates with reserveStatus=0.
  Authenticates by customer API key only (no X-Customer-ID header).
  create/sign-url/update/cancel poll for webhook events after printing the Passkey/agent URL (max 15 min); use --no-watch to skip.

Examples:
  clink-cli instruction create \\
    --payment-instrument-id pi_xxx --title "Business trip" \\
    --effective-until-time "2026-06-25 00:00:00" \\
    --mandates '[{"title":"Hotel","description":"Hotel payment","amountLimit":1000.00,"currencyCode":"USD","merchantCategoryCode":"7011","effectiveUntilTime":"2026-06-25 00:00:00"}]' \\
    --sandbox --format json
  clink-cli instruction sign-url \\
    --payment-instrument-id pi_xxx --purchase-instruction-id ins_xxx --format json
  clink-cli instruction list --valid-only --payment-instrument-id pi_xxx --format json
  clink-cli instruction get --purchase-instruction-id ins_xxx --format json
  clink-cli instruction cancel --sandbox --format json
`;
var EVENTS_HELP = `clink-cli events

Usage:
  clink-cli events poll [options]

Subcommands:
  poll              Poll the webhook-event queue for state-change events

Examples:
  clink-cli events poll --format json
  clink-cli events poll --type payment_method.added --format json
`;
var EVENTS_POLL_HELP = `clink-cli events poll

Poll the latest state-change events (POST /agent/event-hub/webhook-events/poll)
within a bounded window, process and cache them, and (by default) acknowledge them via
POST /agent/event-hub/webhook-events/ack. Use this to consume state changes on demand
instead of relying on the link-command watch.

Usage:
  clink-cli events poll [options]

Options:
  --max-wait <seconds>         Bounded window across retries (default 60)
  --limit <n>                  Max events per poll (pageSize, default 20)
  --type <eventType>           Return early once an event of this type arrives (exact match)
  --no-ack                     Peek without acknowledging the events
Output (data):
  { "ready": bool, "timedOut": bool, "events": [...], "ackedEventIds": [...] }
  On timeout, "resumeCommand" is included \u2014 rerun it to continue (acked events are
  removed server-side, so no offset is needed).

Notes:
  A single poll returns the whole batch it reads in "events". payment_method.* events
  refresh the cached payment methods in local wallet state; risk_rule.updated events
  upsert local risk rule state. --type controls both when to stop waiting and which
  events are acked: only events matching --type are acknowledged, so unrelated events
  stay on the queue for a later poll. Without --type, the whole batch is acked.
  --no-ack peeks without acknowledging anything.

Examples:
  clink-cli events poll --format json
  clink-cli events poll --type payment_method.updated --format json
  clink-cli events poll --no-ack --format json
`;
function printHelp(command, subcommand) {
  const output = getHelpText(command, subcommand);
  process.stdout.write(output);
}
function getHelpText(command, subcommand) {
  switch (command) {
    case "wallet":
      switch (subcommand) {
        case "init":
          return WALLET_INIT_HELP;
        case "status":
          return WALLET_STATUS_HELP;
        default:
          return WALLET_HELP;
      }
    case "card":
      switch (subcommand) {
        case "binding-link":
          return CARD_BINDING_LINK_HELP;
        case "setup-link":
          return CARD_SETUP_LINK_HELP;
        case "modify-link":
          return CARD_MODIFY_LINK_HELP;
        case "list":
          return CARD_LIST_HELP;
        case "get":
          return CARD_GET_HELP;
        default:
          return CARD_HELP;
      }
    case "risk":
      switch (subcommand) {
        case "get":
          return RISK_RULE_GET_HELP;
        case "link":
          return RISK_RULE_LINK_HELP;
        default:
          return RISK_RULE_HELP;
      }
    case "pay":
      return PAY_HELP;
    case "instruction":
      return INSTRUCTION_HELP;
    case "events":
      switch (subcommand) {
        case "poll":
          return EVENTS_POLL_HELP;
        default:
          return EVENTS_HELP;
      }
    case "tool":
      switch (subcommand) {
        case "item-id":
          return TOOL_ITEM_ID_HELP;
        default:
          return TOOL_HELP;
      }
    case "refund":
      switch (subcommand) {
        case "create":
          return REFUND_CREATE_HELP;
        case "get":
          return REFUND_GET_HELP;
        default:
          return REFUND_HELP;
      }
    case "ucp-checkout":
      return UCP_CHECKOUT_HELP;
    case "config":
      switch (subcommand) {
        case "set":
          return CONFIG_SET_HELP;
        case "get":
          return CONFIG_GET_HELP;
        case "unset":
          return CONFIG_UNSET_HELP;
        default:
          return CONFIG_HELP;
      }
    default:
      return ROOT_HELP;
  }
}

// dist/output.js
function printSuccess(data, format) {
  const envelope = {
    ok: true,
    data
  };
  process.stdout.write(serialize(envelope, format));
}
function printError(error, options) {
  const cliError = error instanceof CliError ? error : new CliError("api_error", error.message, 1);
  if (!options.explicitFormat) {
    process.stderr.write(renderHumanError(cliError, options.helpHint));
    return cliError.exitCode;
  }
  const envelope = {
    ok: false,
    error: {
      type: cliError.type,
      code: cliError.code,
      message: cliError.message
    }
  };
  process.stderr.write(serialize(envelope, options.format));
  return cliError.exitCode;
}
function serialize(value, format) {
  if (format === "pretty") {
    return `${JSON.stringify(value, null, 2)}
`;
  }
  return `${JSON.stringify(value)}
`;
}
function renderHumanError(error, helpHint) {
  const lines = [`Error: ${error.message}`];
  if (helpHint) {
    lines.push(`Hint: ${helpHint}`);
  }
  return `${lines.join("\n")}
`;
}

// dist/tool.js
import { resolveCname as nodeResolveCname } from "node:dns/promises";
async function resolveUcpItemIdFromUrl(rawUrl, options = {}) {
  const url = parseUrl(rawUrl);
  const hostname = normalizeHostname(url.hostname);
  if (isMyShopifyHost(hostname)) {
    return shopifyResult(url, "myshopify_domain");
  }
  const resolveCname = options.resolveCname ?? nodeResolveCname;
  if (await hasShopifyCname(hostname, resolveCname)) {
    return shopifyResult(url, "cname");
  }
  return {
    item_id: "unknown",
    site_type: "unknown",
    strategy: "unknown"
  };
}
function parseUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    throw validationError("invalid --url");
  }
}
function shopifyResult(url, strategy) {
  return {
    item_id: url.searchParams.get("variant")?.trim() || "unknown",
    site_type: "shopify",
    strategy
  };
}
function isMyShopifyHost(hostname) {
  return hostname.endsWith(".myshopify.com");
}
async function hasShopifyCname(hostname, resolveCname, seen = /* @__PURE__ */ new Set()) {
  const normalized = normalizeHostname(hostname);
  if (seen.has(normalized) || seen.size >= 8) {
    return false;
  }
  seen.add(normalized);
  let cnames;
  try {
    cnames = await resolveCname(normalized);
  } catch {
    return false;
  }
  for (const cname of cnames.map(normalizeHostname)) {
    if (cname === "shops.myshopify.com") {
      return true;
    }
  }
  for (const cname of cnames) {
    if (await hasShopifyCname(cname, resolveCname, seen)) {
      return true;
    }
  }
  return false;
}
function normalizeHostname(value) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

// dist/cli.js
var INSTRUCTION_PATH = "/agent/cwallet/instructions";
var INSTRUCTION_STATUSES = /* @__PURE__ */ new Set(["CREATED", "ACTIVE", "PENDING", "CANCELLED", "EXPIRED", "DECLINED"]);
var RECURRING_FREQUENCIES = ["WEEKLY", "MONTHLY", "YEARLY"];
var RECURRING_FREQUENCY_SET = new Set(RECURRING_FREQUENCIES);
var UCP_EXTERNAL_CHECKOUT_PATH = "/agent/ucp/external/checkout-sessions";
var OLD_PAY_FIXED_MERCHANT_CATEGORY_CODE = "5999";
async function runCli(argv) {
  const args = parseArgs(argv);
  const [command, subcommand] = args.positionals;
  if (getBooleanFlag(args.flags, "help")) {
    printHelp(command, subcommand);
    return EXIT_CODES.OK;
  }
  if (!command) {
    printHelp();
    return EXIT_CODES.OK;
  }
  const storedConfig = await readStoredConfig();
  const runtimeConfig = resolveRuntimeConfig(storedConfig, args.flags);
  const globalOptions = resolveGlobalOptions(args, storedConfig);
  const context = {
    args,
    storedConfig,
    runtimeConfig,
    globalOptions
  };
  switch (command) {
    case "wallet":
      return handleWalletCommand(subcommand, context);
    case "card":
      return handleCardCommand(subcommand, context);
    case "risk":
      return handleRiskRuleCommand(subcommand, context);
    case "pay":
      return handlePayCommand(context);
    case "refund":
      return handleRefundCommand(subcommand, context);
    case "ucp-checkout":
      return handleUcpCheckoutCommand(subcommand, context);
    case "instruction":
      return handleInstructionCommand(subcommand, context);
    case "events":
      return handleEventsCommand(subcommand, context);
    case "tool":
      return handleToolCommand(subcommand, context);
    case "config":
      return handleConfigCommand(subcommand, context);
    default:
      throw validationError(`unsupported command: ${command}`);
  }
}
async function handleToolCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("tool");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "item-id":
      return toolItemId(context);
    default:
      throw validationError(`unsupported tool command: ${subcommand}`);
  }
}
async function toolItemId(context) {
  const url = requireStringFlag(context.args.flags, "missing --url", "url");
  const result = await resolveUcpItemIdFromUrl(url);
  printSuccess(result, context.globalOptions.format);
  return EXIT_CODES.OK;
}
function resolveGlobalOptions(args, storedConfig) {
  const formatFlag = getStringFlag(args.flags, "format");
  const format = formatFlag === "pretty" ? "pretty" : "json";
  const timeout = getStringFlag(args.flags, "timeout");
  return {
    format,
    dryRun: getBooleanFlag(args.flags, "dry-run"),
    timeoutMs: timeout ? parseTimeout(timeout) : 3e4,
    open: resolveOpenFlag(storedConfig, args.flags),
    watch: resolveWatchFlag(args.flags)
  };
}
function resolveWatchFlag(flags) {
  if (getBooleanFlag(flags, "no-watch")) {
    return false;
  }
  if (flags.watch !== void 0) {
    return getBooleanFlag(flags, "watch");
  }
  return true;
}
async function maybeWatchEvents(context, url, label) {
  if (!context.globalOptions.watch || context.globalOptions.dryRun) {
    return;
  }
  const result = await watchEvents({
    runtimeConfig: context.runtimeConfig,
    timeoutMs: context.globalOptions.timeoutMs,
    url,
    label
  });
  printSuccess(result, context.globalOptions.format);
}
async function handleEventsCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("events");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "poll":
      return eventsPoll(context);
    default:
      throw validationError(`unsupported events command: ${subcommand}`);
  }
}
async function eventsPoll(context) {
  const flags = context.args.flags;
  const maxWaitSeconds = parseIntFlag(getStringFlag(flags, "max-wait"), "invalid --max-wait", 1);
  const pageSize = parseIntFlag(getStringFlag(flags, "limit"), "invalid --limit", 1);
  const type = getStringFlag(flags, "type");
  const ack = !getBooleanFlag(flags, "no-ack");
  if (context.globalOptions.dryRun) {
    printSuccess({ ready: false, timedOut: false, events: [], ackedEventIds: [], dryRun: true }, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  const result = await collectWebhookEvents({
    runtimeConfig: context.runtimeConfig,
    timeoutMs: context.globalOptions.timeoutMs,
    ack,
    ...maxWaitSeconds !== void 0 ? { maxDurationMs: maxWaitSeconds * 1e3 } : {},
    ...pageSize !== void 0 ? { pageSize } : {},
    ...type ? { type } : {}
  });
  printSuccess({
    ready: result.ready,
    timedOut: result.timedOut,
    events: result.events,
    ackedEventIds: result.ackedEventIds,
    ...result.timedOut ? { resumeCommand: buildResumeCommand(type, ack, context.globalOptions.format) } : {}
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
function parseIntFlag(value, message, min) {
  if (value === void 0) {
    return void 0;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw validationError(message);
  }
  return parsed;
}
function buildResumeCommand(type, ack, format) {
  const parts = ["clink-cli events poll"];
  if (type) {
    parts.push(`--type ${type}`);
  }
  if (!ack) {
    parts.push("--no-ack");
  }
  parts.push(`--format ${format}`);
  return parts.join(" ");
}
async function handleWalletCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("wallet");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "init":
      return walletInit(context);
    case "status":
      return walletStatus(context);
    default:
      throw validationError("unsupported wallet command");
  }
}
async function walletInit(context) {
  const email = requireStringFlag(context.args.flags, "missing --email", "email");
  const name = requireStringFlag(context.args.flags, "missing --name", "name");
  const source = getStringFlag(context.args.flags, "source") ?? "agent";
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: "/agent/cwallet/customer/bootstrap",
    body: compact({
      email,
      name,
      source
    }),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  if (isDryRun(result)) {
    printSuccess(result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  const nextConfig = cloneStoredConfig(context.storedConfig);
  nextConfig.baseUrl = context.runtimeConfig.baseUrl;
  nextConfig.email = email;
  nextConfig.name = name;
  delete nextConfig.paymentMethods;
  delete nextConfig.riskRules;
  const customerId = asOptionalString(data.customerId);
  const customerApiKey = asOptionalString(data.customerAPIKey ?? data.customerApiKey);
  if (customerId) {
    nextConfig.customerId = customerId;
  } else {
    delete nextConfig.customerId;
  }
  if (customerApiKey) {
    nextConfig.customerApiKey = customerApiKey;
  } else {
    delete nextConfig.customerApiKey;
  }
  await writeStoredConfig(nextConfig);
  printSuccess({
    customerId: nextConfig.customerId ?? null,
    email,
    name,
    hasCustomerApiKey: Boolean(nextConfig.customerApiKey),
    configPath: "~/.clink-cli/config.json"
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function walletStatus(context) {
  printSuccess({
    baseUrl: context.storedConfig.baseUrl,
    customerId: context.storedConfig.customerId ?? null,
    email: context.storedConfig.email ?? null,
    name: context.storedConfig.name ?? null,
    hasCustomerApiKey: Boolean(context.storedConfig.customerApiKey),
    defaultOpenLinks: context.storedConfig.defaultOpenLinks,
    configPath: "~/.clink-cli/config.json"
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function handleCardCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("card");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "binding-link":
      return cardBindingLink(context);
    case "setup-link":
      return cardRedirectLink(context, "card setup");
    case "modify-link":
      return cardRedirectLink(context, "card management");
    case "list":
      return cardList(context);
    case "get":
      return cardGet(context);
    default:
      throw validationError("unsupported card command");
  }
}
async function cardBindingLink(context) {
  const prepared = await resolveBindingLink(context);
  if (prepared.dryRun) {
    printSuccess(prepared.result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  printSuccess(prepared.data, context.globalOptions.format);
  await maybeWatchEvents(context, prepared.url, "card binding");
  return EXIT_CODES.OK;
}
async function cardRedirectLink(context, label) {
  const prepared = await resolveBindingLink(context);
  if (prepared.dryRun) {
    printSuccess(prepared.result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  maybeOpenBrowser(context.globalOptions.open, prepared.url);
  printSuccess({
    url: prepared.url,
    paymentMethodsVoList: prepared.data.paymentMethodsVoList ?? []
  }, context.globalOptions.format);
  await maybeWatchEvents(context, prepared.url, label);
  return EXIT_CODES.OK;
}
async function resolveBindingLink(context) {
  const result = await callBindingLink(context);
  if (isDryRun(result)) {
    return { dryRun: true, result };
  }
  const data = unwrapApiData(result.body);
  await cachePaymentMethods(context, data.paymentMethodsVoList);
  const bindingUrl = asRequiredString(data.bindingUrl, "missing bindingUrl in response");
  const url = buildBareDomainUrl(bindingUrl);
  return { dryRun: false, data, url };
}
async function callBindingLink(context) {
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: "/agent/cwallet/card/bindingLink",
    headers: buildCustomerHeaders(context.runtimeConfig),
    body: {
      customerId: context.runtimeConfig.customerId,
      hasCustomerApiKey: Boolean(context.runtimeConfig.customerApiKey)
    },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  if (!isDryRun(result)) {
    assertApiSuccess(result.status, result.body);
  }
  return result;
}
async function cardList(context) {
  printSuccess(getStoredPaymentMethods(context), context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function cardGet(context) {
  const paymentInstrumentId = requireStringFlag(context.args.flags, "missing --payment-instrument-id", "payment-instrument-id");
  const paymentMethod = getStoredPaymentMethods(context).find((item) => typeof item.paymentInstrumentId === "string" && item.paymentInstrumentId === paymentInstrumentId);
  if (!paymentMethod) {
    throw validationError(`payment method not found in local config: ${paymentInstrumentId}`);
  }
  printSuccess(paymentMethod, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function handleRiskRuleCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("risk");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "get":
      return riskRuleGet(context);
    case "link":
      return riskRuleLink(context);
    default:
      throw validationError("unsupported risk command");
  }
}
async function riskRuleLink(context) {
  const agentBaseUrl = resolveAgentBaseUrl(context.runtimeConfig.baseUrl);
  const url = new URL("/risk-rules-setup", agentBaseUrl).toString();
  maybeOpenBrowser(context.globalOptions.open, url);
  printSuccess({ url }, context.globalOptions.format);
  await maybeWatchEvents(context, url, "risk rule configuration");
  return EXIT_CODES.OK;
}
async function riskRuleGet(context) {
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "GET",
    path: "/agent/risk/rule/settings",
    headers: buildCustomerHeaders(context.runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function handlePayCommand(context) {
  const flags = context.args.flags;
  const sessionId = getStringFlag(flags, "session-id");
  const merchantId = getStringFlag(flags, "merchant-id");
  const paymentMethodType = getStringFlag(flags, "payment-method-type") ?? "CARD";
  if (!sessionId && !merchantId) {
    throw validationError("pay requires either --merchant-id or --session-id");
  }
  if (sessionId && merchantId) {
    throw validationError("pay accepts either --merchant-id or --session-id, not both");
  }
  let paymentInstrumentId = getStringFlag(flags, "payment-instrument-id");
  if (!paymentInstrumentId) {
    paymentInstrumentId = await resolveDefaultPaymentInstrumentId(context);
  }
  const legacyPurchaseInstructionId = getStringFlag(flags, "purchase-instruction-id");
  const explicitInstructionId = getStringFlag(flags, "instruction-id");
  const instructionId = explicitInstructionId ?? legacyPurchaseInstructionId;
  if (legacyPurchaseInstructionId !== void 0 && explicitInstructionId !== void 0 && legacyPurchaseInstructionId !== explicitInstructionId) {
    throw validationError("--instruction-id and --purchase-instruction-id must match when both are provided");
  }
  const mandateId = getStringFlag(flags, "mandate-id");
  const shippingAddress = optionalJsonObjectFlag(flags, "shipping-address");
  const products = optionalJsonArrayFlag(flags, "products");
  const aiAgentInstructionBo = compact({
    instructionId,
    mandateId,
    shippingAddressJson: shippingAddress === void 0 ? void 0 : JSON.stringify(shippingAddress),
    merchantInfo: { merchantCategoryCode: OLD_PAY_FIXED_MERCHANT_CATEGORY_CODE },
    products
  });
  const vicChargeFields = {
    instruction_id: instructionId,
    mandate_id: mandateId,
    shippingaddress: shippingAddress,
    aiAgentInstructionBo: Object.keys(aiAgentInstructionBo).length > 0 ? aiAgentInstructionBo : void 0,
    // Backward-compatible alias for older callers/backend revisions; new charge integrations should
    // use instruction_id.
    purchaseInstructionId: legacyPurchaseInstructionId
  };
  const body = sessionId ? compact({
    paymentInstrumentId,
    paymentMethodType,
    sessionId,
    ...vicChargeFields
  }) : compact({
    paymentInstrumentId,
    paymentMethodType,
    merchantId,
    customAmount: parseAmount(requireStringFlag(flags, "missing --amount", "amount")),
    paymentCurrency: requireStringFlag(flags, "missing --currency", "currency"),
    ...vicChargeFields
  });
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: "/agent/order/charge",
    headers: buildCustomerHeaders(context.runtimeConfig),
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  if (isDryRun(result)) {
    printSuccess(result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  const flag3DS = Number(data.channelPaymentResponse?.flag3DS ?? 0);
  const redirectUrl = data.channelPaymentResponse?.action?.redirectUrl;
  printSuccess(data, context.globalOptions.format);
  if (flag3DS === 1 && typeof redirectUrl === "string" && redirectUrl.length > 0) {
    await maybeWatchEvents(context, redirectUrl, "3-D Secure authentication");
    return EXIT_CODES.THREE_DS;
  }
  return EXIT_CODES.OK;
}
async function resolveDefaultPaymentInstrumentId(context) {
  return pickDefaultPaymentInstrument(getStoredPaymentMethods(context));
}
async function handleRefundCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("refund");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "create":
      return refundCreate(context);
    case "get":
      return refundGet(context);
    default:
      throw validationError("unsupported refund command");
  }
}
async function refundCreate(context) {
  const orderId = requireStringFlag(context.args.flags, "missing --order-id", "order-id");
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: "/agent/cwallet/refund/apply",
    headers: buildCustomerHeaders(context.runtimeConfig),
    body: { orderId },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function refundGet(context) {
  const refundId = requireStringFlag(context.args.flags, "missing --refund-id", "refund-id");
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "GET",
    path: `/agent/cwallet/refund/${encodeURIComponent(refundId)}`,
    headers: buildCustomerHeaders(context.runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function handleUcpCheckoutCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("ucp-checkout");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "create":
      return ucpCheckoutCreate(context);
    case "get":
      return ucpCheckoutGet(context);
    case "update":
      return ucpCheckoutUpdate(context);
    case "cancel":
      return ucpCheckoutCancel(context);
    case "complete":
      return ucpCheckoutComplete(context);
    default:
      throw validationError(`unsupported ucp-checkout command: ${subcommand}`);
  }
}
async function ucpCheckoutCreate(context) {
  const flags = context.args.flags;
  const currency = requireStringFlag(flags, "missing --currency", "currency");
  const body = compact({
    merchant_url: requireStringFlag(flags, "missing --merchant-url", "merchant-url"),
    merchant_name: getStringFlag(flags, "merchant-name"),
    merchant_category_code: requireStringFlag(flags, "missing --merchant-category-code", "merchant-category-code"),
    order_channel_id: getStringFlag(flags, "order-channel-id"),
    currency,
    instruction_id: requireStringFlag(flags, "missing --instruction-id", "instruction-id"),
    mandate_id: requireStringFlag(flags, "missing --mandate-id", "mandate-id"),
    buyer: optionalJsonFlag(flags, "buyer"),
    line_items: normalizeExternalCheckoutCreateLineItems(requireJsonArrayFlag(flags, "line-items"), currency),
    shipping_address: optionalJsonFlag(flags, "shipping-address"),
    metadata: optionalJsonFlag(flags, "metadata")
  });
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: UCP_EXTERNAL_CHECKOUT_PATH,
    headers: buildUcpCheckoutHeaders(context),
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function ucpCheckoutGet(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutCreateOnlyFlags(flags);
  const checkoutId = requireCheckoutId(flags);
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "GET",
    path: `${UCP_EXTERNAL_CHECKOUT_PATH}/${encodeURIComponent(checkoutId)}`,
    headers: buildCustomerApiKeyHeaders(context.runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function ucpCheckoutUpdate(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutCreateOnlyFlags(flags);
  const checkoutId = requireCheckoutId(flags);
  const body = compact({
    line_items: requireJsonArrayFlag(flags, "line-items"),
    buyer: optionalJsonFlag(flags, "buyer"),
    shipping_address: optionalJsonFlag(flags, "shipping-address"),
    metadata: optionalJsonFlag(flags, "metadata")
  });
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "PUT",
    path: `${UCP_EXTERNAL_CHECKOUT_PATH}/${encodeURIComponent(checkoutId)}`,
    headers: buildUcpCheckoutHeaders(context),
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function ucpCheckoutComplete(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutCreateOnlyFlags(flags);
  if ("credential-token" in flags) {
    throw validationError("--credential-token is not supported on external ucp-checkout complete; pass --payment-instrument-id");
  }
  const checkoutId = requireCheckoutId(flags);
  const paymentInstrumentId = requireStringFlag(flags, "missing --payment-instrument-id", "payment-instrument-id");
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: `${UCP_EXTERNAL_CHECKOUT_PATH}/${encodeURIComponent(checkoutId)}/complete`,
    headers: buildUcpCheckoutHeaders(context),
    body: {
      payment_instrument_id: paymentInstrumentId
    },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function ucpCheckoutCancel(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutCreateOnlyFlags(flags);
  const checkoutId = requireCheckoutId(flags);
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: `${UCP_EXTERNAL_CHECKOUT_PATH}/${encodeURIComponent(checkoutId)}/cancel`,
    headers: buildCustomerApiKeyHeaders(context.runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
function requireCheckoutId(flags) {
  return requireStringFlag(flags, "missing --checkout-id", "checkout-id");
}
var EXTERNAL_CHECKOUT_MONEY_FIELDS = /* @__PURE__ */ new Set(["amount", "price"]);
var CURRENCY_FRACTION_DIGIT_CACHE = /* @__PURE__ */ new Map();
function normalizeExternalCheckoutCreateLineItems(lineItems, currency) {
  return lineItems.map((lineItem, index) => normalizeExternalCheckoutMoneyFields(lineItem, currency, `--line-items[${index}]`));
}
function normalizeExternalCheckoutMoneyFields(value, currency, path2) {
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeExternalCheckoutMoneyFields(item, currency, `${path2}[${index}]`));
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => {
    const fieldPath = `${path2}.${key}`;
    if (EXTERNAL_CHECKOUT_MONEY_FIELDS.has(key) && isDecimalInput(fieldValue)) {
      return [key, majorAmountToMinorUnits(fieldValue, currency, fieldPath)];
    }
    return [key, normalizeExternalCheckoutMoneyFields(fieldValue, currency, fieldPath)];
  }));
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function isDecimalInput(value) {
  return typeof value === "number" || typeof value === "string";
}
function majorAmountToMinorUnits(value, currency, fieldPath) {
  const normalizedCurrency = currency.trim().toUpperCase();
  const fractionDigits = getCurrencyFractionDigits(normalizedCurrency);
  const rawValue = typeof value === "number" ? numberAmountToString(value, fieldPath) : value.trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(rawValue);
  if (!match) {
    throw validationError(`${fieldPath} must be a decimal amount`);
  }
  const sign = match[1] ?? "";
  const integerPart = match[2];
  const rawFractionPart = match[3];
  if (integerPart === void 0) {
    throw validationError(`${fieldPath} must be a decimal amount`);
  }
  if (sign === "-") {
    throw validationError(`${fieldPath} must be a non-negative amount`);
  }
  const fractionPart = rawFractionPart ?? "";
  const extraFraction = fractionPart.slice(fractionDigits);
  if (/[1-9]/.test(extraFraction)) {
    throw validationError(`${fieldPath} supports at most ${fractionDigits} decimal places for ${normalizedCurrency}`);
  }
  const scale = 10n ** BigInt(fractionDigits);
  const minorUnits = BigInt(integerPart) * scale + BigInt(fractionPart.slice(0, fractionDigits).padEnd(fractionDigits, "0") || "0");
  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw validationError(`${fieldPath} is too large`);
  }
  return Number(minorUnits);
}
function numberAmountToString(value, fieldPath) {
  if (!Number.isFinite(value)) {
    throw validationError(`${fieldPath} must be a finite decimal amount`);
  }
  const rawValue = String(value);
  if (/e/i.test(rawValue)) {
    throw validationError(`${fieldPath} must be a plain decimal amount`);
  }
  return rawValue;
}
function getCurrencyFractionDigits(currency) {
  const cached = CURRENCY_FRACTION_DIGIT_CACHE.get(currency);
  if (cached !== void 0) {
    return cached;
  }
  try {
    const fractionDigits = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency
    }).resolvedOptions().maximumFractionDigits ?? 2;
    CURRENCY_FRACTION_DIGIT_CACHE.set(currency, fractionDigits);
    return fractionDigits;
  } catch {
    throw validationError(`unsupported currency: ${currency}`);
  }
}
function rejectUcpCheckoutCreateOnlyFlags(flags) {
  if ("instruction-id" in flags || "mandate-id" in flags) {
    throw validationError("--instruction-id and --mandate-id are only supported on ucp-checkout create");
  }
}
function buildUcpCheckoutHeaders(context) {
  return {
    ...buildCustomerApiKeyHeaders(context.runtimeConfig),
    "Idempotency-Key": getStringFlag(context.args.flags, "idempotency-key") ?? randomUUID()
  };
}
async function handleInstructionCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("instruction");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "create":
      return instructionCreate(context);
    case "sign-url":
      return instructionSignUrl(context);
    case "list":
      return instructionList(context);
    case "get":
      return instructionGet(context);
    case "update":
    case "cancel":
      return instructionAgentPageUrl(context);
    default:
      throw validationError("unsupported instruction command");
  }
}
function instructionBody(context) {
  const flags = context.args.flags;
  const isRecurring = getBooleanFlag(flags, "is-recurring");
  const mandates = normalizeInstructionMandates(requireJsonArrayFlag(flags, "mandates"), isRecurring);
  const body = compact({
    paymentInstrumentId: requireStringFlag(flags, "missing --payment-instrument-id", "payment-instrument-id"),
    title: requireStringFlag(flags, "missing --title", "title"),
    description: getStringFlag(flags, "description"),
    effectiveUntilTime: utcDateTimeFlag(flags, "effective-until-time"),
    extra: optionalJsonFlag(flags, "extra"),
    mandates
  });
  if (isRecurring) {
    body.isRecurring = true;
  }
  const shippingAddress = optionalJsonFlag(flags, "shipping-address");
  if (shippingAddress !== void 0) {
    body.shippingAddress = shippingAddress;
  }
  return body;
}
function normalizeInstructionMandates(mandates, isRecurring) {
  if (!isRecurring) {
    return mandates;
  }
  return mandates.map((mandate, index) => {
    if (!isJsonObject(mandate)) {
      throw validationError(`--mandates[${index}] must be a JSON object when --is-recurring is set`);
    }
    const frequency = mandate.recurringFrequency;
    if (typeof frequency !== "string" || frequency.trim().length === 0) {
      throw validationError(`--mandates[${index}].recurringFrequency is required when --is-recurring is set`);
    }
    const normalizedFrequency = frequency.trim().toUpperCase();
    if (!RECURRING_FREQUENCY_SET.has(normalizedFrequency)) {
      throw validationError(`--mandates[${index}].recurringFrequency must be one of ${RECURRING_FREQUENCIES.join(", ")}`);
    }
    return {
      ...mandate,
      recurringFrequency: normalizedFrequency
    };
  });
}
function utcDateTimeFlag(flags, name) {
  const value = getStringFlag(flags, name);
  if (value === void 0) {
    return void 0;
  }
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    throw validationError(`--${name} must use UTC datetime format yyyy-MM-dd HH:mm:ss, got "${value}"`);
  }
  return value;
}
function requireJsonArrayFlag(flags, name) {
  const parsed = parseJsonFlag(requireStringFlag(flags, `missing --${name} (JSON array)`, name), `--${name}`);
  if (!Array.isArray(parsed)) {
    throw validationError(`--${name} must be a JSON array`);
  }
  return parsed;
}
async function instructionCreate(context) {
  const agentBaseUrl = resolveAgentBaseUrl(context.runtimeConfig.baseUrl);
  const body = instructionBody(context);
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: INSTRUCTION_PATH,
    headers: buildInstructionHeaders(context.runtimeConfig),
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  if (isDryRun(result)) {
    printSuccess(result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  const instructionId = asRequiredString(data.instructionId, "missing instructionId in instruction create response");
  const paymentInstrumentId = asOptionalString(data.paymentInstrumentId) ?? body.paymentInstrumentId;
  const mandateIds = extractMandateIds(data);
  const passkeyUrl = buildAgentPasskeyUrl(agentBaseUrl, paymentInstrumentId, instructionId);
  maybeOpenBrowser(context.globalOptions.open, passkeyUrl);
  printSuccess({
    ...data,
    action: "created",
    instructionId,
    paymentInstrumentId,
    ...mandateIds.length > 0 ? { mandateIds } : {},
    requiresPasskey: true,
    passkeyUrl
  }, context.globalOptions.format);
  await maybeWatchEvents(context, passkeyUrl, "purchase instruction authorization");
  return EXIT_CODES.OK;
}
async function instructionGet(context) {
  const instructionId = requireStringFlag(context.args.flags, "missing --purchase-instruction-id", "purchase-instruction-id");
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "GET",
    path: `${INSTRUCTION_PATH}/${encodeURIComponent(instructionId)}`,
    headers: buildInstructionHeaders(context.runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(result, context);
}
async function instructionSignUrl(context) {
  const flags = context.args.flags;
  const paymentInstrumentId = requireStringFlag(flags, "missing --payment-instrument-id", "payment-instrument-id");
  const instructionId = requireStringFlag(flags, "missing --purchase-instruction-id", "purchase-instruction-id");
  const url = buildAgentPasskeyUrl(resolveAgentBaseUrl(context.runtimeConfig.baseUrl), paymentInstrumentId, instructionId);
  maybeOpenBrowser(context.globalOptions.open, url);
  printSuccess({ url }, context.globalOptions.format);
  await maybeWatchEvents(context, url, "purchase instruction authorization");
  return EXIT_CODES.OK;
}
async function instructionList(context) {
  const validOnly = getBooleanFlag(context.args.flags, "valid-only");
  const rawStatus = getStringFlag(context.args.flags, "status");
  if (validOnly && rawStatus && rawStatus.toUpperCase() !== "ACTIVE") {
    throw validationError(`--valid-only cannot be combined with --status ${rawStatus.toUpperCase()}`);
  }
  const status = validOnly ? "ACTIVE" : rawStatus?.toUpperCase();
  if (status && !INSTRUCTION_STATUSES.has(status)) {
    throw validationError(`invalid instruction status: ${status}`);
  }
  const paymentInstrumentId = getStringFlag(context.args.flags, "payment-instrument-id");
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "GET",
    path: INSTRUCTION_PATH,
    headers: buildInstructionHeaders(context.runtimeConfig),
    query: { status, paymentInstrumentId },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  if (!validOnly || isDryRun(result)) {
    return finishApiCommand(result, context);
  }
  assertApiSuccess(result.status, result.body);
  printSuccess(filterValidInstructionsPayload(unwrapApiData(result.body)), context.globalOptions.format);
  return EXIT_CODES.OK;
}
function filterValidInstructionsPayload(data) {
  if (Array.isArray(data)) {
    return filterValidInstructionArray(data);
  }
  if (!isRecord(data)) {
    return data;
  }
  for (const key of ["records", "list", "items", "instructions", "purchaseInstructions"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      return { ...data, [key]: filterValidInstructionArray(value) };
    }
  }
  return data;
}
function filterValidInstructionArray(instructions) {
  return instructions.flatMap((instruction) => {
    if (!isRecord(instruction) || normalizedString(instruction.status) !== "ACTIVE") {
      return [];
    }
    if (!isOneTimeInstruction(instruction)) {
      return [instruction];
    }
    const mandateKey = findMandateArrayKey(instruction);
    if (!mandateKey) {
      return [instruction];
    }
    const mandates = instruction[mandateKey];
    const usableMandates = mandates.filter(isUsableOneTimeMandate);
    if (usableMandates.length === 0) {
      return [];
    }
    return [{ ...instruction, [mandateKey]: usableMandates }];
  });
}
function findMandateArrayKey(instruction) {
  return ["mandates", "mandateList", "mandateVoList"].find((key) => Array.isArray(instruction[key]));
}
function isOneTimeInstruction(instruction) {
  return isZeroLike(instruction.isRecurring);
}
function isUsableOneTimeMandate(mandate) {
  return isRecord(mandate) && isZeroLike(mandate.reserveStatus);
}
function isZeroLike(value) {
  return value === 0 || value === "0" || value === false;
}
function normalizedString(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}
async function instructionAgentPageUrl(context) {
  const url = resolveAgentBaseUrl(context.runtimeConfig.baseUrl);
  maybeOpenBrowser(context.globalOptions.open, url);
  printSuccess({ url }, context.globalOptions.format);
  await maybeWatchEvents(context, url, "purchase instruction change");
  return EXIT_CODES.OK;
}
async function handleConfigCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("config");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "set":
      return configSet(context);
    case "get":
      return configGet(context);
    case "unset":
      return configUnset(context);
    default:
      throw validationError("unsupported config command");
  }
}
async function configSet(context) {
  const [, , rawKey, rawValue] = context.args.positionals;
  if (!rawKey || rawValue === void 0) {
    throw validationError("usage: clink-cli config set <key> <value>");
  }
  const key = normalizeConfigKey(rawKey);
  const nextConfig = cloneStoredConfig(context.storedConfig);
  setConfigValue(nextConfig, key, parseConfigValue(key, rawValue));
  await writeStoredConfig(nextConfig);
  printSuccess(buildConfigView(nextConfig), context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function configGet(context) {
  printSuccess(buildConfigView(context.storedConfig), context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function configUnset(context) {
  const [, , rawKey] = context.args.positionals;
  if (!rawKey) {
    throw validationError("usage: clink-cli config unset <key>");
  }
  const key = normalizeConfigKey(rawKey);
  const nextConfig = cloneStoredConfig(context.storedConfig);
  if (key === "baseUrl" || key === "defaultOpenLinks") {
    setConfigValue(nextConfig, key, defaultValueForRequiredKey(key));
  } else {
    unsetConfigValue(nextConfig, key);
  }
  await writeStoredConfig(nextConfig);
  printSuccess(buildConfigView(nextConfig), context.globalOptions.format);
  return EXIT_CODES.OK;
}
function defaultValueForRequiredKey(key) {
  return key === "baseUrl" ? "https://api.clinkbill.com" : false;
}
function setConfigValue(target, key, value) {
  if (isCustomerConfigKey(key)) {
    switch (key) {
      case "customerId":
        target.customerId = value;
        return;
      case "customerApiKey":
        target.customerApiKey = value;
        return;
      case "email":
        target.email = value;
        return;
      case "name":
        target.name = value;
        return;
      default:
        return;
    }
  }
  switch (key) {
    case "baseUrl":
      target.baseUrl = value;
      return;
    case "defaultOpenLinks":
      target.defaultOpenLinks = value;
      return;
    default:
      return;
  }
}
function unsetConfigValue(target, key) {
  if (!isCustomerConfigKey(key)) {
    return;
  }
  switch (key) {
    case "customerId":
      delete target.customerId;
      break;
    case "customerApiKey":
      delete target.customerApiKey;
      break;
    case "email":
      delete target.email;
      break;
    case "name":
      delete target.name;
      break;
    default:
      break;
  }
}
function buildConfigView(config) {
  return {
    baseUrl: config.baseUrl,
    customerId: config.customerId ?? null,
    email: config.email ?? null,
    name: config.name ?? null,
    hasCustomerApiKey: Boolean(config.customerApiKey),
    defaultOpenLinks: config.defaultOpenLinks,
    configPath: "~/.clink-cli/config.json"
  };
}
async function cachePaymentMethods(context, value) {
  const paymentMethods = Array.isArray(value) ? value.filter((item) => typeof item === "object" && item !== null && typeof item.paymentInstrumentId === "string" && item.paymentInstrumentId.length > 0) : [];
  const nextConfig = cloneStoredConfig(context.storedConfig);
  nextConfig.paymentMethods = paymentMethods.map((item) => ({ ...item }));
  await writeStoredConfig(nextConfig);
  context.storedConfig.paymentMethods = nextConfig.paymentMethods;
}
function getStoredPaymentMethods(context) {
  return Array.isArray(context.storedConfig.paymentMethods) ? context.storedConfig.paymentMethods : [];
}
async function finishApiCommand(result, context) {
  if (isDryRun(result)) {
    printSuccess(result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  assertApiSuccess(result.status, result.body);
  printSuccess(unwrapApiData(result.body), context.globalOptions.format);
  return EXIT_CODES.OK;
}
function isDryRun(value) {
  return "dryRun" in value;
}
function parseTimeout(value) {
  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw validationError("timeout must be a positive number of milliseconds");
  }
  return timeoutMs;
}
function parseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw validationError("amount must be a positive number");
  }
  return amount;
}
function optionalJsonFlag(flags, name) {
  const value = getStringFlag(flags, name);
  if (value === void 0) {
    return void 0;
  }
  return parseJsonFlag(value, `--${name}`);
}
function optionalJsonObjectFlag(flags, name) {
  const value = getStringFlag(flags, name);
  if (value === void 0) {
    return void 0;
  }
  const parsed = parseJsonFlag(value, `--${name}`);
  if (!isJsonObject(parsed)) {
    throw validationError(`--${name} must be a JSON object`);
  }
  return parsed;
}
function optionalJsonArrayFlag(flags, name) {
  const value = getStringFlag(flags, name);
  if (value === void 0) {
    return void 0;
  }
  const parsed = parseJsonFlag(value, `--${name}`);
  if (!Array.isArray(parsed)) {
    throw validationError(`--${name} must be a JSON array`);
  }
  return parsed;
}
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function compact(value) {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== void 0));
}
function asOptionalString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function asRequiredString(value, message) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw validationError(message);
}
function extractMandateIds(instruction) {
  const mandateKey = findMandateArrayKey(instruction);
  if (!mandateKey) {
    return [];
  }
  return instruction[mandateKey].map((mandate) => isRecord(mandate) ? extractMandateId(mandate) : void 0).filter((mandateId) => mandateId !== void 0);
}
function extractMandateId(mandate) {
  for (const key of ["mandateId", "mandateNo", "mandate_id", "id"]) {
    const value = asOptionalString(mandate[key]);
    if (value !== void 0) {
      return value;
    }
  }
  return void 0;
}

// dist/index.js
async function main() {
  try {
    const exitCode = await runCli(process.argv.slice(2));
    process.exitCode = exitCode;
  } catch (error) {
    process.exitCode = printError(error, detectErrorPresentation(process.argv.slice(2)));
  }
}
function detectErrorPresentation(argv) {
  const format = detectFormat(argv);
  const explicitFormat = hasExplicitFormat(argv);
  const helpHint = detectHelpHint(argv);
  const result = {
    format,
    explicitFormat
  };
  if (!explicitFormat && helpHint) {
    result.helpHint = helpHint;
  }
  return result;
}
function detectFormat(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--format" && argv[index + 1] === "json") {
      return "json";
    }
    if (token === "--format" && argv[index + 1] === "pretty") {
      return "pretty";
    }
    if (token === "--format=json") {
      return "json";
    }
    if (token === "--format=pretty") {
      return "pretty";
    }
  }
  return "json";
}
function hasExplicitFormat(argv) {
  return argv.some((token) => token === "--format" || token.startsWith("--format="));
}
function detectHelpHint(argv) {
  const command = argv.find((token) => !token.startsWith("-"));
  if (!command) {
    return "Run `clink-cli --help`.";
  }
  if (["wallet", "card", "risk", "pay", "refund", "ucp-checkout", "instruction", "events", "tool", "config"].includes(command)) {
    return `Run \`clink-cli ${command} --help\`.`;
  }
  return "Run `clink-cli --help`.";
}
void main();
