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
        optionGroups.forEach((options2, group) => {
          const optionList = options2.map((option) => {
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
      constructor(options2) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options2.forEach((option) => {
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
    var path4 = __require("node:path");
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
          const localBin = path4.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path4.extname(baseName))) return void 0;
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
          executableDir = path4.resolve(
            path4.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path4.basename(
              this._scriptPath,
              path4.extname(this._scriptPath)
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
        launchWithNode = sourceExt.includes(path4.extname(executableFile));
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
        this._name = path4.basename(filename, path4.extname(filename));
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
      executableDir(path5) {
        if (path5 === void 0) return this._executableDir;
        this._executableDir = path5;
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

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "node_modules/qrcode/lib/can-promise.js"(exports, module) {
    module.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/qrcode/lib/core/utils.js"(exports) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports.getSymbolSize = function getSymbolSize(version) {
      if (!version) throw new Error('"version" cannot be null or undefined');
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
      return version * 4 + 17;
    };
    exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
      return CODEWORDS_COUNT[version];
    };
    exports.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
    exports.L = { bit: 1 };
    exports.M = { bit: 0 };
    exports.Q = { bit: 3 };
    exports.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports.L;
        case "m":
        case "medium":
          return exports.M;
        case "q":
        case "quartile":
          return exports.Q;
        case "h":
        case "high":
          return exports.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module.exports = BitBuffer;
  }
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module.exports = BitMatrix;
  }
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports.getRowColCoords = function getRowColCoords(version) {
      if (version === 1) return [];
      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports.getPositions = function getPositions(version) {
      const coords = [];
      const pos = exports.getRowColCoords(version);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports.getPositions = function getPositions(version) {
      const size = getSymbolSize(version);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
    exports.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports.from = function from(value) {
      return exports.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module2 = data.get(row, col);
          if (module2 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module2;
            sameCountCol = 1;
          }
          module2 = data.get(col, row);
          if (module2 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module2;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports.applyMask(p, data);
        const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
        exports.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/qrcode/lib/core/galois-field.js"(exports) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/qrcode/lib/core/polynomial.js"(exports) {
    var GF = require_galois_field();
    exports.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module.exports = ReedSolomonEncoder;
  }
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/qrcode/lib/core/version-check.js"(exports) {
    exports.isValid = function isValid(version) {
      return !isNaN(version) && version >= 1 && version <= 40;
    };
  }
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/qrcode/lib/core/regex.js"(exports) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports.KANJI = new RegExp(kanji, "g");
    exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports.BYTE = new RegExp(byte, "g");
    exports.NUMERIC = new RegExp(numeric, "g");
    exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports.testKanji = function testKanji(str2) {
      return TEST_KANJI.test(str2);
    };
    exports.testNumeric = function testNumeric(str2) {
      return TEST_NUMERIC.test(str2);
    };
    exports.testAlphanumeric = function testAlphanumeric(str2) {
      return TEST_ALPHANUMERIC.test(str2);
    };
  }
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/qrcode/lib/core/mode.js"(exports) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports.MIXED = {
      bit: -1
    };
    exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid version: " + version);
      }
      if (version >= 1 && version < 10) return mode.ccBits[0];
      else if (version < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports.KANJI;
      else return exports.BYTE;
    };
    exports.toString = function toString(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports.NUMERIC;
        case "alphanumeric":
          return exports.ALPHANUMERIC;
        case "kanji":
          return exports.KANJI;
        case "byte":
          return exports.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/qrcode/lib/core/version.js"(exports) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version) {
      return Mode.getCharCountIndicator(mode, version) + 4;
    }
    function getTotalBitsFromDataArray(segments, version) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports.getEncodedBits = function getEncodedBits(version) {
      if (!VersionCheck.isValid(version) || version < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version << 12 | d;
    };
  }
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/qrcode/lib/core/format-info.js"(exports) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module.exports = NumericData;
  }
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module.exports = AlphanumericData;
  }
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module.exports = ByteData;
  }
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module.exports = KanjiData;
  }
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/dijkstrajs/dijkstra.js"(exports, module) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open5 = dijkstra.PriorityQueue.make();
        open5.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open5.empty()) {
          closest = open5.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open5.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module !== "undefined") {
      module.exports = dijkstra;
    }
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/qrcode/lib/core/segments.js"(exports) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str2) {
      return unescape(encodeURIComponent(str2)).length;
    }
    function getSegments(regex, mode, str2) {
      const segments = [];
      let result;
      while ((result = regex.exec(str2)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports.fromString = function fromString(data, version) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path4 = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path4.length - 1; i++) {
        optimizedSegs.push(graph.table[path4[i]].node);
      }
      return exports.fromArray(mergeSegments(optimizedSegs));
    };
    exports.rawSplit = function rawSplit(data) {
      return exports.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode/lib/core/qrcode.js"(exports) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version) {
      const pos = AlignmentPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version);
      let row, col, mod;
      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version) {
        version = bestVersion;
      } else if (version < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version >= 7) {
        setupVersionInfo(modules, version);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports.create = function create(data, options2) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version;
      let mask;
      if (typeof options2 !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options2.errorCorrectionLevel, ECLevel.M);
        version = Version.from(options2.version);
        mask = MaskPattern.from(options2.maskPattern);
        if (options2.toSJISFunc) {
          Utils.setToSJISFunction(options2.toSJISFunc);
        }
      }
      return createSymbol(data, version, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS({
  "node_modules/pngjs/lib/chunkstream.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var ChunkStream = module.exports = function() {
      Stream.call(this);
      this._buffers = [];
      this._buffered = 0;
      this._reads = [];
      this._paused = false;
      this._encoding = "utf8";
      this.writable = true;
    };
    util.inherits(ChunkStream, Stream);
    ChunkStream.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
      process.nextTick(
        function() {
          this._process();
          if (this._paused && this._reads && this._reads.length > 0) {
            this._paused = false;
            this.emit("drain");
          }
        }.bind(this)
      );
    };
    ChunkStream.prototype.write = function(data, encoding) {
      if (!this.writable) {
        this.emit("error", new Error("Stream not writable"));
        return false;
      }
      let dataBuffer;
      if (Buffer.isBuffer(data)) {
        dataBuffer = data;
      } else {
        dataBuffer = Buffer.from(data, encoding || this._encoding);
      }
      this._buffers.push(dataBuffer);
      this._buffered += dataBuffer.length;
      this._process();
      if (this._reads && this._reads.length === 0) {
        this._paused = true;
      }
      return this.writable && !this._paused;
    };
    ChunkStream.prototype.end = function(data, encoding) {
      if (data) {
        this.write(data, encoding);
      }
      this.writable = false;
      if (!this._buffers) {
        return;
      }
      if (this._buffers.length === 0) {
        this._end();
      } else {
        this._buffers.push(null);
        this._process();
      }
    };
    ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
    ChunkStream.prototype._end = function() {
      if (this._reads.length > 0) {
        this.emit("error", new Error("Unexpected end of input"));
      }
      this.destroy();
    };
    ChunkStream.prototype.destroy = function() {
      if (!this._buffers) {
        return;
      }
      this.writable = false;
      this._reads = null;
      this._buffers = null;
      this.emit("close");
    };
    ChunkStream.prototype._processReadAllowingLess = function(read) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read.length) {
        this._buffered -= read.length;
        this._buffers[0] = smallerBuf.slice(read.length);
        read.func.call(this, smallerBuf.slice(0, read.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read.length);
      while (pos < read.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read.length;
      read.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read = this._reads[0];
          if (read.allowLess) {
            this._processReadAllowingLess(read);
          } else if (this._buffered >= read.length) {
            this._processRead(read);
          } else {
            break;
          }
        }
        if (this._buffers && !this.writable) {
          this._end();
        }
      } catch (ex) {
        this.emit("error", ex);
      }
    };
  }
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS({
  "node_modules/pngjs/lib/interlace.js"(exports) {
    "use strict";
    var imagePasses = [
      {
        // pass 1 - 1px
        x: [0],
        y: [0]
      },
      {
        // pass 2 - 1px
        x: [4],
        y: [0]
      },
      {
        // pass 3 - 2px
        x: [0, 4],
        y: [4]
      },
      {
        // pass 4 - 4px
        x: [2, 6],
        y: [0, 4]
      },
      {
        // pass 5 - 8px
        x: [0, 2, 4, 6],
        y: [2, 6]
      },
      {
        // pass 6 - 16px
        x: [1, 3, 5, 7],
        y: [0, 2, 4, 6]
      },
      {
        // pass 7 - 32px
        x: [0, 1, 2, 3, 4, 5, 6, 7],
        y: [1, 3, 5, 7]
      }
    ];
    exports.getImagePasses = function(width, height) {
      let images = [];
      let xLeftOver = width % 8;
      let yLeftOver = height % 8;
      let xRepeats = (width - xLeftOver) / 8;
      let yRepeats = (height - yLeftOver) / 8;
      for (let i = 0; i < imagePasses.length; i++) {
        let pass = imagePasses[i];
        let passWidth = xRepeats * pass.x.length;
        let passHeight = yRepeats * pass.y.length;
        for (let j = 0; j < pass.x.length; j++) {
          if (pass.x[j] < xLeftOver) {
            passWidth++;
          } else {
            break;
          }
        }
        for (let j = 0; j < pass.y.length; j++) {
          if (pass.y[j] < yLeftOver) {
            passHeight++;
          } else {
            break;
          }
        }
        if (passWidth > 0 && passHeight > 0) {
          images.push({ width: passWidth, height: passHeight, index: i });
        }
      }
      return images;
    };
    exports.getInterlaceIterator = function(width) {
      return function(x, y, pass) {
        let outerXLeftOver = x % imagePasses[pass].x.length;
        let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
        let outerYLeftOver = y % imagePasses[pass].y.length;
        let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
        return outerX * 4 + outerY * width * 4;
      };
    };
  }
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS({
  "node_modules/pngjs/lib/paeth-predictor.js"(exports, module) {
    "use strict";
    module.exports = function paethPredictor(left, above, upLeft) {
      let paeth = left + above - upLeft;
      let pLeft = Math.abs(paeth - left);
      let pAbove = Math.abs(paeth - above);
      let pUpLeft = Math.abs(paeth - upLeft);
      if (pLeft <= pAbove && pLeft <= pUpLeft) {
        return left;
      }
      if (pAbove <= pUpLeft) {
        return above;
      }
      return upLeft;
    };
  }
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS({
  "node_modules/pngjs/lib/filter-parse.js"(exports, module) {
    "use strict";
    var interlaceUtils = require_interlace();
    var paethPredictor = require_paeth_predictor();
    function getByteWidth(width, bpp, depth) {
      let byteWidth = width * bpp;
      if (depth !== 8) {
        byteWidth = Math.ceil(byteWidth / (8 / depth));
      }
      return byteWidth;
    }
    var Filter = module.exports = function(bitmapInfo, dependencies) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let interlace = bitmapInfo.interlace;
      let bpp = bitmapInfo.bpp;
      let depth = bitmapInfo.depth;
      this.read = dependencies.read;
      this.write = dependencies.write;
      this.complete = dependencies.complete;
      this._imageIndex = 0;
      this._images = [];
      if (interlace) {
        let passes = interlaceUtils.getImagePasses(width, height);
        for (let i = 0; i < passes.length; i++) {
          this._images.push({
            byteWidth: getByteWidth(passes[i].width, bpp, depth),
            height: passes[i].height,
            lineIndex: 0
          });
        }
      } else {
        this._images.push({
          byteWidth: getByteWidth(width, bpp, depth),
          height,
          lineIndex: 0
        });
      }
      if (depth === 8) {
        this._xComparison = bpp;
      } else if (depth === 16) {
        this._xComparison = bpp * 2;
      } else {
        this._xComparison = 1;
      }
    };
    Filter.prototype.start = function() {
      this.read(
        this._images[this._imageIndex].byteWidth + 1,
        this._reverseFilterLine.bind(this)
      );
    };
    Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        unfilteredLine[x] = rawByte + f1Left;
      }
    };
    Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f2Up = lastLine ? lastLine[x] : 0;
        unfilteredLine[x] = rawByte + f2Up;
      }
    };
    Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f3Up = lastLine ? lastLine[x] : 0;
        let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f3Add = Math.floor((f3Left + f3Up) / 2);
        unfilteredLine[x] = rawByte + f3Add;
      }
    };
    Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f4Up = lastLine ? lastLine[x] : 0;
        let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
        let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
        unfilteredLine[x] = rawByte + f4Add;
      }
    };
    Filter.prototype._reverseFilterLine = function(rawData) {
      let filter = rawData[0];
      let unfilteredLine;
      let currentImage = this._images[this._imageIndex];
      let byteWidth = currentImage.byteWidth;
      if (filter === 0) {
        unfilteredLine = rawData.slice(1, byteWidth + 1);
      } else {
        unfilteredLine = Buffer.alloc(byteWidth);
        switch (filter) {
          case 1:
            this._unFilterType1(rawData, unfilteredLine, byteWidth);
            break;
          case 2:
            this._unFilterType2(rawData, unfilteredLine, byteWidth);
            break;
          case 3:
            this._unFilterType3(rawData, unfilteredLine, byteWidth);
            break;
          case 4:
            this._unFilterType4(rawData, unfilteredLine, byteWidth);
            break;
          default:
            throw new Error("Unrecognised filter type - " + filter);
        }
      }
      this.write(unfilteredLine);
      currentImage.lineIndex++;
      if (currentImage.lineIndex >= currentImage.height) {
        this._lastLine = null;
        this._imageIndex++;
        currentImage = this._images[this._imageIndex];
      } else {
        this._lastLine = unfilteredLine;
      }
      if (currentImage) {
        this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
      } else {
        this._lastLine = null;
        this.complete();
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS({
  "node_modules/pngjs/lib/filter-parse-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var ChunkStream = require_chunkstream();
    var Filter = require_filter_parse();
    var FilterAsync = module.exports = function(bitmapInfo) {
      ChunkStream.call(this);
      let buffers = [];
      let that = this;
      this._filter = new Filter(bitmapInfo, {
        read: this.read.bind(this),
        write: function(buffer) {
          buffers.push(buffer);
        },
        complete: function() {
          that.emit("complete", Buffer.concat(buffers));
        }
      });
      this._filter.start();
    };
    util.inherits(FilterAsync, ChunkStream);
  }
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pngjs/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
      TYPE_IHDR: 1229472850,
      TYPE_IEND: 1229278788,
      TYPE_IDAT: 1229209940,
      TYPE_PLTE: 1347179589,
      TYPE_tRNS: 1951551059,
      // eslint-disable-line camelcase
      TYPE_gAMA: 1732332865,
      // eslint-disable-line camelcase
      // color-type bits
      COLORTYPE_GRAYSCALE: 0,
      COLORTYPE_PALETTE: 1,
      COLORTYPE_COLOR: 2,
      COLORTYPE_ALPHA: 4,
      // e.g. grayscale and alpha
      // color-type combinations
      COLORTYPE_PALETTE_COLOR: 3,
      COLORTYPE_COLOR_ALPHA: 6,
      COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
      },
      GAMMA_DIVISION: 1e5
    };
  }
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS({
  "node_modules/pngjs/lib/crc.js"(exports, module) {
    "use strict";
    var crcTable = [];
    (function() {
      for (let i = 0; i < 256; i++) {
        let currentCrc = i;
        for (let j = 0; j < 8; j++) {
          if (currentCrc & 1) {
            currentCrc = 3988292384 ^ currentCrc >>> 1;
          } else {
            currentCrc = currentCrc >>> 1;
          }
        }
        crcTable[i] = currentCrc;
      }
    })();
    var CrcCalculator = module.exports = function() {
      this._crc = -1;
    };
    CrcCalculator.prototype.write = function(data) {
      for (let i = 0; i < data.length; i++) {
        this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
      }
      return true;
    };
    CrcCalculator.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    CrcCalculator.crc32 = function(buf) {
      let crc = -1;
      for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    };
  }
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS({
  "node_modules/pngjs/lib/parser.js"(exports, module) {
    "use strict";
    var constants3 = require_constants();
    var CrcCalculator = require_crc();
    var Parser = module.exports = function(options2, dependencies) {
      this._options = options2;
      options2.checkCRC = options2.checkCRC !== false;
      this._hasIHDR = false;
      this._hasIEND = false;
      this._emittedHeadersFinished = false;
      this._palette = [];
      this._colorType = 0;
      this._chunks = {};
      this._chunks[constants3.TYPE_IHDR] = this._handleIHDR.bind(this);
      this._chunks[constants3.TYPE_IEND] = this._handleIEND.bind(this);
      this._chunks[constants3.TYPE_IDAT] = this._handleIDAT.bind(this);
      this._chunks[constants3.TYPE_PLTE] = this._handlePLTE.bind(this);
      this._chunks[constants3.TYPE_tRNS] = this._handleTRNS.bind(this);
      this._chunks[constants3.TYPE_gAMA] = this._handleGAMA.bind(this);
      this.read = dependencies.read;
      this.error = dependencies.error;
      this.metadata = dependencies.metadata;
      this.gamma = dependencies.gamma;
      this.transColor = dependencies.transColor;
      this.palette = dependencies.palette;
      this.parsed = dependencies.parsed;
      this.inflateData = dependencies.inflateData;
      this.finished = dependencies.finished;
      this.simpleTransparency = dependencies.simpleTransparency;
      this.headersFinished = dependencies.headersFinished || function() {
      };
    };
    Parser.prototype.start = function() {
      this.read(constants3.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    Parser.prototype._parseSignature = function(data) {
      let signature = constants3.PNG_SIGNATURE;
      for (let i = 0; i < signature.length; i++) {
        if (data[i] !== signature[i]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._parseChunkBegin = function(data) {
      let length = data.readUInt32BE(0);
      let type = data.readUInt32BE(4);
      let name = "";
      for (let i = 4; i < 8; i++) {
        name += String.fromCharCode(data[i]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants3.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name));
        return;
      }
      this.read(length + 4, this._skipChunk.bind(this));
    };
    Parser.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    Parser.prototype._parseChunkEnd = function(data) {
      let fileCrc = data.readInt32BE(0);
      let calcCrc = this._crc.crc32();
      if (this._options.checkCRC && calcCrc !== fileCrc) {
        this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
        return;
      }
      if (!this._hasIEND) {
        this.read(8, this._parseChunkBegin.bind(this));
      }
    };
    Parser.prototype._handleIHDR = function(length) {
      this.read(length, this._parseIHDR.bind(this));
    };
    Parser.prototype._parseIHDR = function(data) {
      this._crc.write(data);
      let width = data.readUInt32BE(0);
      let height = data.readUInt32BE(4);
      let depth = data[8];
      let colorType = data[9];
      let compr = data[10];
      let filter = data[11];
      let interlace = data[12];
      if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
        this.error(new Error("Unsupported bit depth " + depth));
        return;
      }
      if (!(colorType in constants3.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (compr !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (filter !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (interlace !== 0 && interlace !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = colorType;
      let bpp = constants3.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true;
      this.metadata({
        width,
        height,
        depth,
        interlace: Boolean(interlace),
        palette: Boolean(colorType & constants3.COLORTYPE_PALETTE),
        color: Boolean(colorType & constants3.COLORTYPE_COLOR),
        alpha: Boolean(colorType & constants3.COLORTYPE_ALPHA),
        bpp,
        colorType
      });
      this._handleChunkEnd();
    };
    Parser.prototype._handlePLTE = function(length) {
      this.read(length, this._parsePLTE.bind(this));
    };
    Parser.prototype._parsePLTE = function(data) {
      this._crc.write(data);
      let entries = Math.floor(data.length / 3);
      for (let i = 0; i < entries; i++) {
        this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
      }
      this.palette(this._palette);
      this._handleChunkEnd();
    };
    Parser.prototype._handleTRNS = function(length) {
      this.simpleTransparency();
      this.read(length, this._parseTRNS.bind(this));
    };
    Parser.prototype._parseTRNS = function(data) {
      this._crc.write(data);
      if (this._colorType === constants3.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (data.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let i = 0; i < data.length; i++) {
          this._palette[i][3] = data[i];
        }
        this.palette(this._palette);
      }
      if (this._colorType === constants3.COLORTYPE_GRAYSCALE) {
        this.transColor([data.readUInt16BE(0)]);
      }
      if (this._colorType === constants3.COLORTYPE_COLOR) {
        this.transColor([
          data.readUInt16BE(0),
          data.readUInt16BE(2),
          data.readUInt16BE(4)
        ]);
      }
      this._handleChunkEnd();
    };
    Parser.prototype._handleGAMA = function(length) {
      this.read(length, this._parseGAMA.bind(this));
    };
    Parser.prototype._parseGAMA = function(data) {
      this._crc.write(data);
      this.gamma(data.readUInt32BE(0) / constants3.GAMMA_DIVISION);
      this._handleChunkEnd();
    };
    Parser.prototype._handleIDAT = function(length) {
      if (!this._emittedHeadersFinished) {
        this._emittedHeadersFinished = true;
        this.headersFinished();
      }
      this.read(-length, this._parseIDAT.bind(this, length));
    };
    Parser.prototype._parseIDAT = function(length, data) {
      this._crc.write(data);
      if (this._colorType === constants3.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
        throw new Error("Expected palette not found");
      }
      this.inflateData(data);
      let leftOverLength = length - data.length;
      if (leftOverLength > 0) {
        this._handleIDAT(leftOverLength);
      } else {
        this._handleChunkEnd();
      }
    };
    Parser.prototype._handleIEND = function(length) {
      this.read(length, this._parseIEND.bind(this));
    };
    Parser.prototype._parseIEND = function(data) {
      this._crc.write(data);
      this._hasIEND = true;
      this._handleChunkEnd();
      if (this.finished) {
        this.finished();
      }
    };
  }
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS({
  "node_modules/pngjs/lib/bitmapper.js"(exports) {
    "use strict";
    var interlaceUtils = require_interlace();
    var pixelBppMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos === data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = 255;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 1 >= data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = data[rawPos + 1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 2 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = 255;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 3 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = data[rawPos + 3];
      }
    ];
    var pixelBppCustomMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = maxBit;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, pixelData, pxPos) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = pixelData[1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = maxBit;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, pixelData, pxPos) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = pixelData[3];
      }
    ];
    function bitRetriever(data, depth) {
      let leftOver = [];
      let i = 0;
      function split() {
        if (i === data.length) {
          throw new Error("Ran out of data");
        }
        let byte = data[i];
        i++;
        let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
        switch (depth) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            byte2 = data[i];
            i++;
            leftOver.push((byte << 8) + byte2);
            break;
          case 4:
            byte2 = byte & 15;
            byte1 = byte >> 4;
            leftOver.push(byte1, byte2);
            break;
          case 2:
            byte4 = byte & 3;
            byte3 = byte >> 2 & 3;
            byte2 = byte >> 4 & 3;
            byte1 = byte >> 6 & 3;
            leftOver.push(byte1, byte2, byte3, byte4);
            break;
          case 1:
            byte8 = byte & 1;
            byte7 = byte >> 1 & 1;
            byte6 = byte >> 2 & 1;
            byte5 = byte >> 3 & 1;
            byte4 = byte >> 4 & 1;
            byte3 = byte >> 5 & 1;
            byte2 = byte >> 6 & 1;
            byte1 = byte >> 7 & 1;
            leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
            break;
        }
      }
      return {
        get: function(count) {
          while (leftOver.length < count) {
            split();
          }
          let returner = leftOver.slice(0, count);
          leftOver = leftOver.slice(count);
          return returner;
        },
        resetAfterLine: function() {
          leftOver.length = 0;
        },
        end: function() {
          if (i !== data.length) {
            throw new Error("extra data found");
          }
        }
      };
    }
    function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
          rawPos += bpp;
        }
      }
      return rawPos;
    }
    function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pixelData = bits.get(bpp);
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
        }
        bits.resetAfterLine();
      }
    }
    exports.dataToBitMap = function(data, bitmapInfo) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let depth = bitmapInfo.depth;
      let bpp = bitmapInfo.bpp;
      let interlace = bitmapInfo.interlace;
      let bits;
      if (depth !== 8) {
        bits = bitRetriever(data, depth);
      }
      let pxData;
      if (depth <= 8) {
        pxData = Buffer.alloc(width * height * 4);
      } else {
        pxData = new Uint16Array(width * height * 4);
      }
      let maxBit = Math.pow(2, depth) - 1;
      let rawPos = 0;
      let images;
      let getPxPos;
      if (interlace) {
        images = interlaceUtils.getImagePasses(width, height);
        getPxPos = interlaceUtils.getInterlaceIterator(width, height);
      } else {
        let nonInterlacedPxPos = 0;
        getPxPos = function() {
          let returner = nonInterlacedPxPos;
          nonInterlacedPxPos += 4;
          return returner;
        };
        images = [{ width, height }];
      }
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        if (depth === 8) {
          rawPos = mapImage8Bit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            data,
            rawPos
          );
        } else {
          mapImageCustomBit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            bits,
            maxBit
          );
        }
      }
      if (depth === 8) {
        if (rawPos !== data.length) {
          throw new Error("extra data found");
        }
      } else {
        bits.end();
      }
      return pxData;
    };
  }
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS({
  "node_modules/pngjs/lib/format-normaliser.js"(exports, module) {
    "use strict";
    function dePalette(indata, outdata, width, height, palette) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let color = palette[indata[pxPos]];
          if (!color) {
            throw new Error("index " + indata[pxPos] + " not in palette");
          }
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = color[i];
          }
          pxPos += 4;
        }
      }
    }
    function replaceTransparentColor(indata, outdata, width, height, transColor) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let makeTrans = false;
          if (transColor.length === 1) {
            if (transColor[0] === indata[pxPos]) {
              makeTrans = true;
            }
          } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
            makeTrans = true;
          }
          if (makeTrans) {
            for (let i = 0; i < 4; i++) {
              outdata[pxPos + i] = 0;
            }
          }
          pxPos += 4;
        }
      }
    }
    function scaleDepth(indata, outdata, width, height, depth) {
      let maxOutSample = 255;
      let maxInSample = Math.pow(2, depth) - 1;
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = Math.floor(
              indata[pxPos + i] * maxOutSample / maxInSample + 0.5
            );
          }
          pxPos += 4;
        }
      }
    }
    module.exports = function(indata, imageData) {
      let depth = imageData.depth;
      let width = imageData.width;
      let height = imageData.height;
      let colorType = imageData.colorType;
      let transColor = imageData.transColor;
      let palette = imageData.palette;
      let outdata = indata;
      if (colorType === 3) {
        dePalette(indata, outdata, width, height, palette);
      } else {
        if (transColor) {
          replaceTransparentColor(indata, outdata, width, height, transColor);
        }
        if (depth !== 8) {
          if (depth === 16) {
            outdata = Buffer.alloc(width * height * 4);
          }
          scaleDepth(indata, outdata, width, height, depth);
        }
      }
      return outdata;
    };
  }
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS({
  "node_modules/pngjs/lib/parser-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var zlib = __require("zlib");
    var ChunkStream = require_chunkstream();
    var FilterAsync = require_filter_parse_async();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    var ParserAsync = module.exports = function(options2) {
      ChunkStream.call(this);
      this._parser = new Parser(options2, {
        read: this.read.bind(this),
        error: this._handleError.bind(this),
        metadata: this._handleMetaData.bind(this),
        gamma: this.emit.bind(this, "gamma"),
        palette: this._handlePalette.bind(this),
        transColor: this._handleTransColor.bind(this),
        finished: this._finished.bind(this),
        inflateData: this._inflateData.bind(this),
        simpleTransparency: this._simpleTransparency.bind(this),
        headersFinished: this._headersFinished.bind(this)
      });
      this._options = options2;
      this.writable = true;
      this._parser.start();
    };
    util.inherits(ParserAsync, ChunkStream);
    ParserAsync.prototype._handleError = function(err) {
      this.emit("error", err);
      this.writable = false;
      this.destroy();
      if (this._inflate && this._inflate.destroy) {
        this._inflate.destroy();
      }
      if (this._filter) {
        this._filter.destroy();
        this._filter.on("error", function() {
        });
      }
      this.errord = true;
    };
    ParserAsync.prototype._inflateData = function(data) {
      if (!this._inflate) {
        if (this._bitmapInfo.interlace) {
          this._inflate = zlib.createInflate();
          this._inflate.on("error", this.emit.bind(this, "error"));
          this._filter.on("complete", this._complete.bind(this));
          this._inflate.pipe(this._filter);
        } else {
          let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
          let imageSize = rowSize * this._bitmapInfo.height;
          let chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);
          this._inflate = zlib.createInflate({ chunkSize });
          let leftToInflate = imageSize;
          let emitError = this.emit.bind(this, "error");
          this._inflate.on("error", function(err) {
            if (!leftToInflate) {
              return;
            }
            emitError(err);
          });
          this._filter.on("complete", this._complete.bind(this));
          let filterWrite = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(chunk) {
            if (!leftToInflate) {
              return;
            }
            if (chunk.length > leftToInflate) {
              chunk = chunk.slice(0, leftToInflate);
            }
            leftToInflate -= chunk.length;
            filterWrite(chunk);
          });
          this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      }
      this._inflate.write(data);
    };
    ParserAsync.prototype._handleMetaData = function(metaData) {
      this._metaData = metaData;
      this._bitmapInfo = Object.create(metaData);
      this._filter = new FilterAsync(this._bitmapInfo);
    };
    ParserAsync.prototype._handleTransColor = function(transColor) {
      this._bitmapInfo.transColor = transColor;
    };
    ParserAsync.prototype._handlePalette = function(palette) {
      this._bitmapInfo.palette = palette;
    };
    ParserAsync.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    ParserAsync.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    ParserAsync.prototype._finished = function() {
      if (this.errord) {
        return;
      }
      if (!this._inflate) {
        this.emit("error", "No Inflate block");
      } else {
        this._inflate.end();
      }
    };
    ParserAsync.prototype._complete = function(filteredData) {
      if (this.errord) {
        return;
      }
      let normalisedBitmapData;
      try {
        let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
        normalisedBitmapData = formatNormaliser(bitmapData, this._bitmapInfo);
        bitmapData = null;
      } catch (ex) {
        this._handleError(ex);
        return;
      }
      this.emit("parsed", normalisedBitmapData);
    };
  }
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS({
  "node_modules/pngjs/lib/bitpacker.js"(exports, module) {
    "use strict";
    var constants3 = require_constants();
    module.exports = function(dataIn, width, height, options2) {
      let outHasAlpha = [constants3.COLORTYPE_COLOR_ALPHA, constants3.COLORTYPE_ALPHA].indexOf(
        options2.colorType
      ) !== -1;
      if (options2.colorType === options2.inputColorType) {
        let bigEndian = (function() {
          let buffer = new ArrayBuffer(2);
          new DataView(buffer).setInt16(
            0,
            256,
            true
            /* littleEndian */
          );
          return new Int16Array(buffer)[0] !== 256;
        })();
        if (options2.bitDepth === 8 || options2.bitDepth === 16 && bigEndian) {
          return dataIn;
        }
      }
      let data = options2.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
      let maxValue = 255;
      let inBpp = constants3.COLORTYPE_TO_BPP_MAP[options2.inputColorType];
      if (inBpp === 4 && !options2.inputHasAlpha) {
        inBpp = 3;
      }
      let outBpp = constants3.COLORTYPE_TO_BPP_MAP[options2.colorType];
      if (options2.bitDepth === 16) {
        maxValue = 65535;
        outBpp *= 2;
      }
      let outData = Buffer.alloc(width * height * outBpp);
      let inIndex = 0;
      let outIndex = 0;
      let bgColor = options2.bgColor || {};
      if (bgColor.red === void 0) {
        bgColor.red = maxValue;
      }
      if (bgColor.green === void 0) {
        bgColor.green = maxValue;
      }
      if (bgColor.blue === void 0) {
        bgColor.blue = maxValue;
      }
      function getRGBA() {
        let red;
        let green;
        let blue;
        let alpha = maxValue;
        switch (options2.inputColorType) {
          case constants3.COLORTYPE_COLOR_ALPHA:
            alpha = data[inIndex + 3];
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants3.COLORTYPE_COLOR:
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants3.COLORTYPE_ALPHA:
            alpha = data[inIndex + 1];
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          case constants3.COLORTYPE_GRAYSCALE:
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          default:
            throw new Error(
              "input color type:" + options2.inputColorType + " is not supported at present"
            );
        }
        if (options2.inputHasAlpha) {
          if (!outHasAlpha) {
            alpha /= maxValue;
            red = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
              maxValue
            );
            green = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
              maxValue
            );
            blue = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
              maxValue
            );
          }
        }
        return { red, green, blue, alpha };
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let rgba = getRGBA(data, inIndex);
          switch (options2.colorType) {
            case constants3.COLORTYPE_COLOR_ALPHA:
            case constants3.COLORTYPE_COLOR:
              if (options2.bitDepth === 8) {
                outData[outIndex] = rgba.red;
                outData[outIndex + 1] = rgba.green;
                outData[outIndex + 2] = rgba.blue;
                if (outHasAlpha) {
                  outData[outIndex + 3] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(rgba.red, outIndex);
                outData.writeUInt16BE(rgba.green, outIndex + 2);
                outData.writeUInt16BE(rgba.blue, outIndex + 4);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 6);
                }
              }
              break;
            case constants3.COLORTYPE_ALPHA:
            case constants3.COLORTYPE_GRAYSCALE: {
              let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
              if (options2.bitDepth === 8) {
                outData[outIndex] = grayscale;
                if (outHasAlpha) {
                  outData[outIndex + 1] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(grayscale, outIndex);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 2);
                }
              }
              break;
            }
            default:
              throw new Error("unrecognised color Type " + options2.colorType);
          }
          inIndex += inBpp;
          outIndex += outBpp;
        }
      }
      return outData;
    };
  }
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS({
  "node_modules/pngjs/lib/filter-pack.js"(exports, module) {
    "use strict";
    var paethPredictor = require_paeth_predictor();
    function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        rawData[rawPos + x] = pxData[pxPos + x];
      }
    }
    function filterSumNone(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let i = pxPos; i < length; i++) {
        sum += Math.abs(pxData[i]);
      }
      return sum;
    }
    function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumSub(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumUp(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let x = pxPos; x < length; x++) {
        let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        let val = pxData[x] - up;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
      }
      return sum;
    }
    var filters = {
      0: filterNone,
      1: filterSub,
      2: filterUp,
      3: filterAvg,
      4: filterPaeth
    };
    var filterSums = {
      0: filterSumNone,
      1: filterSumSub,
      2: filterSumUp,
      3: filterSumAvg,
      4: filterSumPaeth
    };
    module.exports = function(pxData, width, height, options2, bpp) {
      let filterTypes;
      if (!("filterType" in options2) || options2.filterType === -1) {
        filterTypes = [0, 1, 2, 3, 4];
      } else if (typeof options2.filterType === "number") {
        filterTypes = [options2.filterType];
      } else {
        throw new Error("unrecognised filter types");
      }
      if (options2.bitDepth === 16) {
        bpp *= 2;
      }
      let byteWidth = width * bpp;
      let rawPos = 0;
      let pxPos = 0;
      let rawData = Buffer.alloc((byteWidth + 1) * height);
      let sel = filterTypes[0];
      for (let y = 0; y < height; y++) {
        if (filterTypes.length > 1) {
          let min = Infinity;
          for (let i = 0; i < filterTypes.length; i++) {
            let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
            if (sum < min) {
              sel = filterTypes[i];
              min = sum;
            }
          }
        }
        rawData[rawPos] = sel;
        rawPos++;
        filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
        rawPos += byteWidth;
        pxPos += byteWidth;
      }
      return rawData;
    };
  }
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS({
  "node_modules/pngjs/lib/packer.js"(exports, module) {
    "use strict";
    var constants3 = require_constants();
    var CrcStream = require_crc();
    var bitPacker = require_bitpacker();
    var filter = require_filter_pack();
    var zlib = __require("zlib");
    var Packer = module.exports = function(options2) {
      this._options = options2;
      options2.deflateChunkSize = options2.deflateChunkSize || 32 * 1024;
      options2.deflateLevel = options2.deflateLevel != null ? options2.deflateLevel : 9;
      options2.deflateStrategy = options2.deflateStrategy != null ? options2.deflateStrategy : 3;
      options2.inputHasAlpha = options2.inputHasAlpha != null ? options2.inputHasAlpha : true;
      options2.deflateFactory = options2.deflateFactory || zlib.createDeflate;
      options2.bitDepth = options2.bitDepth || 8;
      options2.colorType = typeof options2.colorType === "number" ? options2.colorType : constants3.COLORTYPE_COLOR_ALPHA;
      options2.inputColorType = typeof options2.inputColorType === "number" ? options2.inputColorType : constants3.COLORTYPE_COLOR_ALPHA;
      if ([
        constants3.COLORTYPE_GRAYSCALE,
        constants3.COLORTYPE_COLOR,
        constants3.COLORTYPE_COLOR_ALPHA,
        constants3.COLORTYPE_ALPHA
      ].indexOf(options2.colorType) === -1) {
        throw new Error(
          "option color type:" + options2.colorType + " is not supported at present"
        );
      }
      if ([
        constants3.COLORTYPE_GRAYSCALE,
        constants3.COLORTYPE_COLOR,
        constants3.COLORTYPE_COLOR_ALPHA,
        constants3.COLORTYPE_ALPHA
      ].indexOf(options2.inputColorType) === -1) {
        throw new Error(
          "option input color type:" + options2.inputColorType + " is not supported at present"
        );
      }
      if (options2.bitDepth !== 8 && options2.bitDepth !== 16) {
        throw new Error(
          "option bit depth:" + options2.bitDepth + " is not supported at present"
        );
      }
    };
    Packer.prototype.getDeflateOptions = function() {
      return {
        chunkSize: this._options.deflateChunkSize,
        level: this._options.deflateLevel,
        strategy: this._options.deflateStrategy
      };
    };
    Packer.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    Packer.prototype.filterData = function(data, width, height) {
      let packedData = bitPacker(data, width, height, this._options);
      let bpp = constants3.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      let filteredData = filter(packedData, width, height, this._options, bpp);
      return filteredData;
    };
    Packer.prototype._packChunk = function(type, data) {
      let len = data ? data.length : 0;
      let buf = Buffer.alloc(len + 12);
      buf.writeUInt32BE(len, 0);
      buf.writeUInt32BE(type, 4);
      if (data) {
        data.copy(buf, 8);
      }
      buf.writeInt32BE(
        CrcStream.crc32(buf.slice(4, buf.length - 4)),
        buf.length - 4
      );
      return buf;
    };
    Packer.prototype.packGAMA = function(gamma) {
      let buf = Buffer.alloc(4);
      buf.writeUInt32BE(Math.floor(gamma * constants3.GAMMA_DIVISION), 0);
      return this._packChunk(constants3.TYPE_gAMA, buf);
    };
    Packer.prototype.packIHDR = function(width, height) {
      let buf = Buffer.alloc(13);
      buf.writeUInt32BE(width, 0);
      buf.writeUInt32BE(height, 4);
      buf[8] = this._options.bitDepth;
      buf[9] = this._options.colorType;
      buf[10] = 0;
      buf[11] = 0;
      buf[12] = 0;
      return this._packChunk(constants3.TYPE_IHDR, buf);
    };
    Packer.prototype.packIDAT = function(data) {
      return this._packChunk(constants3.TYPE_IDAT, data);
    };
    Packer.prototype.packIEND = function() {
      return this._packChunk(constants3.TYPE_IEND, null);
    };
  }
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS({
  "node_modules/pngjs/lib/packer-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var constants3 = require_constants();
    var Packer = require_packer();
    var PackerAsync = module.exports = function(opt) {
      Stream.call(this);
      let options2 = opt || {};
      this._packer = new Packer(options2);
      this._deflate = this._packer.createDeflate();
      this.readable = true;
    };
    util.inherits(PackerAsync, Stream);
    PackerAsync.prototype.pack = function(data, width, height, gamma) {
      this.emit("data", Buffer.from(constants3.PNG_SIGNATURE));
      this.emit("data", this._packer.packIHDR(width, height));
      if (gamma) {
        this.emit("data", this._packer.packGAMA(gamma));
      }
      let filteredData = this._packer.filterData(data, width, height);
      this._deflate.on("error", this.emit.bind(this, "error"));
      this._deflate.on(
        "data",
        function(compressedData) {
          this.emit("data", this._packer.packIDAT(compressedData));
        }.bind(this)
      );
      this._deflate.on(
        "end",
        function() {
          this.emit("data", this._packer.packIEND());
          this.emit("end");
        }.bind(this)
      );
      this._deflate.end(filteredData);
    };
  }
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS({
  "node_modules/pngjs/lib/sync-inflate.js"(exports, module) {
    "use strict";
    var assert = __require("assert").ok;
    var zlib = __require("zlib");
    var util = __require("util");
    var kMaxLength = __require("buffer").kMaxLength;
    function Inflate(opts) {
      if (!(this instanceof Inflate)) {
        return new Inflate(opts);
      }
      if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
        opts.chunkSize = zlib.Z_MIN_CHUNK;
      }
      zlib.Inflate.call(this, opts);
      this._offset = this._offset === void 0 ? this._outOffset : this._offset;
      this._buffer = this._buffer || this._outBuffer;
      if (opts && opts.maxLength != null) {
        this._maxLength = opts.maxLength;
      }
    }
    function createInflate(opts) {
      return new Inflate(opts);
    }
    function _close(engine, callback) {
      if (callback) {
        process.nextTick(callback);
      }
      if (!engine._handle) {
        return;
      }
      engine._handle.close();
      engine._handle = null;
    }
    Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
      if (typeof asyncCb === "function") {
        return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
      }
      let self = this;
      let availInBefore = chunk && chunk.length;
      let availOutBefore = this._chunkSize - this._offset;
      let leftToInflate = this._maxLength;
      let inOff = 0;
      let buffers = [];
      let nread = 0;
      let error;
      this.on("error", function(err) {
        error = err;
      });
      function handleChunk(availInAfter, availOutAfter) {
        if (self._hadError) {
          return;
        }
        let have = availOutBefore - availOutAfter;
        assert(have >= 0, "have should not go down");
        if (have > 0) {
          let out = self._buffer.slice(self._offset, self._offset + have);
          self._offset += have;
          if (out.length > leftToInflate) {
            out = out.slice(0, leftToInflate);
          }
          buffers.push(out);
          nread += out.length;
          leftToInflate -= out.length;
          if (leftToInflate === 0) {
            return false;
          }
        }
        if (availOutAfter === 0 || self._offset >= self._chunkSize) {
          availOutBefore = self._chunkSize;
          self._offset = 0;
          self._buffer = Buffer.allocUnsafe(self._chunkSize);
        }
        if (availOutAfter === 0) {
          inOff += availInBefore - availInAfter;
          availInBefore = availInAfter;
          return true;
        }
        return false;
      }
      assert(this._handle, "zlib binding closed");
      let res;
      do {
        res = this._handle.writeSync(
          flushFlag,
          chunk,
          // in
          inOff,
          // in_off
          availInBefore,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          availOutBefore
        );
        res = res || this._writeState;
      } while (!this._hadError && handleChunk(res[0], res[1]));
      if (this._hadError) {
        throw error;
      }
      if (nread >= kMaxLength) {
        _close(this);
        throw new RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
        );
      }
      let buf = Buffer.concat(buffers, nread);
      _close(this);
      return buf;
    };
    util.inherits(Inflate, zlib.Inflate);
    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Not a string or buffer");
      }
      let flushFlag = engine._finishFlushFlag;
      if (flushFlag == null) {
        flushFlag = zlib.Z_FINISH;
      }
      return engine._processChunk(buffer, flushFlag);
    }
    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }
    module.exports = exports = inflateSync;
    exports.Inflate = Inflate;
    exports.createInflate = createInflate;
    exports.inflateSync = inflateSync;
  }
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS({
  "node_modules/pngjs/lib/sync-reader.js"(exports, module) {
    "use strict";
    var SyncReader = module.exports = function(buffer) {
      this._buffer = buffer;
      this._reads = [];
    };
    SyncReader.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
    };
    SyncReader.prototype.process = function() {
      while (this._reads.length > 0 && this._buffer.length) {
        let read = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read.length);
          read.func.call(this, buf.slice(0, read.length));
        } else {
          break;
        }
      }
      if (this._reads.length > 0) {
        return new Error("There are some read requests waitng on finished stream");
      }
      if (this._buffer.length > 0) {
        return new Error("unrecognised content at end of stream");
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS({
  "node_modules/pngjs/lib/filter-parse-sync.js"(exports) {
    "use strict";
    var SyncReader = require_sync_reader();
    var Filter = require_filter_parse();
    exports.process = function(inBuffer, bitmapInfo) {
      let outBuffers = [];
      let reader = new SyncReader(inBuffer);
      let filter = new Filter(bitmapInfo, {
        read: reader.read.bind(reader),
        write: function(bufferPart) {
          outBuffers.push(bufferPart);
        },
        complete: function() {
        }
      });
      filter.start();
      reader.process();
      return Buffer.concat(outBuffers);
    };
  }
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS({
  "node_modules/pngjs/lib/parser-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    var inflateSync = require_sync_inflate();
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var SyncReader = require_sync_reader();
    var FilterSync = require_filter_parse_sync();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    module.exports = function(buffer, options2) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let err;
      function handleError(_err_) {
        err = _err_;
      }
      let metaData;
      function handleMetaData(_metaData_) {
        metaData = _metaData_;
      }
      function handleTransColor(transColor) {
        metaData.transColor = transColor;
      }
      function handlePalette(palette) {
        metaData.palette = palette;
      }
      function handleSimpleTransparency() {
        metaData.alpha = true;
      }
      let gamma;
      function handleGamma(_gamma_) {
        gamma = _gamma_;
      }
      let inflateDataList = [];
      function handleInflateData(inflatedData2) {
        inflateDataList.push(inflatedData2);
      }
      let reader = new SyncReader(buffer);
      let parser = new Parser(options2, {
        read: reader.read.bind(reader),
        error: handleError,
        metadata: handleMetaData,
        gamma: handleGamma,
        palette: handlePalette,
        transColor: handleTransColor,
        inflateData: handleInflateData,
        simpleTransparency: handleSimpleTransparency
      });
      parser.start();
      reader.process();
      if (err) {
        throw err;
      }
      let inflateData = Buffer.concat(inflateDataList);
      inflateDataList.length = 0;
      let inflatedData;
      if (metaData.interlace) {
        inflatedData = zlib.inflateSync(inflateData);
      } else {
        let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
        let imageSize = rowSize * metaData.height;
        inflatedData = inflateSync(inflateData, {
          chunkSize: imageSize,
          maxLength: imageSize
        });
      }
      inflateData = null;
      if (!inflatedData || !inflatedData.length) {
        throw new Error("bad png - invalid inflate data response");
      }
      let unfilteredData = FilterSync.process(inflatedData, metaData);
      inflateData = null;
      let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
      unfilteredData = null;
      let normalisedBitmapData = formatNormaliser(bitmapData, metaData);
      metaData.data = normalisedBitmapData;
      metaData.gamma = gamma || 0;
      return metaData;
    };
  }
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS({
  "node_modules/pngjs/lib/packer-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var constants3 = require_constants();
    var Packer = require_packer();
    module.exports = function(metaData, opt) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let options2 = opt || {};
      let packer = new Packer(options2);
      let chunks = [];
      chunks.push(Buffer.from(constants3.PNG_SIGNATURE));
      chunks.push(packer.packIHDR(metaData.width, metaData.height));
      if (metaData.gamma) {
        chunks.push(packer.packGAMA(metaData.gamma));
      }
      let filteredData = packer.filterData(
        metaData.data,
        metaData.width,
        metaData.height
      );
      let compressedData = zlib.deflateSync(
        filteredData,
        packer.getDeflateOptions()
      );
      filteredData = null;
      if (!compressedData || !compressedData.length) {
        throw new Error("bad png - invalid compressed data response");
      }
      chunks.push(packer.packIDAT(compressedData));
      chunks.push(packer.packIEND());
      return Buffer.concat(chunks);
    };
  }
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS({
  "node_modules/pngjs/lib/png-sync.js"(exports) {
    "use strict";
    var parse = require_parser_sync();
    var pack = require_packer_sync();
    exports.read = function(buffer, options2) {
      return parse(buffer, options2 || {});
    };
    exports.write = function(png, options2) {
      return pack(png, options2);
    };
  }
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS({
  "node_modules/pngjs/lib/png.js"(exports) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var Parser = require_parser_async();
    var Packer = require_packer_async();
    var PNGSync = require_png_sync();
    var PNG = exports.PNG = function(options2) {
      Stream.call(this);
      options2 = options2 || {};
      this.width = options2.width | 0;
      this.height = options2.height | 0;
      this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
      if (options2.fill && this.data) {
        this.data.fill(0);
      }
      this.gamma = 0;
      this.readable = this.writable = true;
      this._parser = new Parser(options2);
      this._parser.on("error", this.emit.bind(this, "error"));
      this._parser.on("close", this._handleClose.bind(this));
      this._parser.on("metadata", this._metadata.bind(this));
      this._parser.on("gamma", this._gamma.bind(this));
      this._parser.on(
        "parsed",
        function(data) {
          this.data = data;
          this.emit("parsed", data);
        }.bind(this)
      );
      this._packer = new Packer(options2);
      this._packer.on("data", this.emit.bind(this, "data"));
      this._packer.on("end", this.emit.bind(this, "end"));
      this._parser.on("close", this._handleClose.bind(this));
      this._packer.on("error", this.emit.bind(this, "error"));
    };
    util.inherits(PNG, Stream);
    PNG.sync = PNGSync;
    PNG.prototype.pack = function() {
      if (!this.data || !this.data.length) {
        this.emit("error", "No data provided");
        return this;
      }
      process.nextTick(
        function() {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this)
      );
      return this;
    };
    PNG.prototype.parse = function(data, callback) {
      if (callback) {
        let onParsed, onError;
        onParsed = function(parsedData) {
          this.removeListener("error", onError);
          this.data = parsedData;
          callback(null, this);
        }.bind(this);
        onError = function(err) {
          this.removeListener("parsed", onParsed);
          callback(err, null);
        }.bind(this);
        this.once("parsed", onParsed);
        this.once("error", onError);
      }
      this.end(data);
      return this;
    };
    PNG.prototype.write = function(data) {
      this._parser.write(data);
      return true;
    };
    PNG.prototype.end = function(data) {
      this._parser.end(data);
    };
    PNG.prototype._metadata = function(metadata) {
      this.width = metadata.width;
      this.height = metadata.height;
      this.emit("metadata", metadata);
    };
    PNG.prototype._gamma = function(gamma) {
      this.gamma = gamma;
    };
    PNG.prototype._handleClose = function() {
      if (!this._parser.writable && !this._packer.readable) {
        this.emit("close");
      }
    };
    PNG.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
      srcX |= 0;
      srcY |= 0;
      width |= 0;
      height |= 0;
      deltaX |= 0;
      deltaY |= 0;
      if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
        throw new Error("bitblt reading outside image");
      }
      if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
        throw new Error("bitblt writing outside image");
      }
      for (let y = 0; y < height; y++) {
        src.data.copy(
          dst.data,
          (deltaY + y) * dst.width + deltaX << 2,
          (srcY + y) * src.width + srcX << 2,
          (srcY + y) * src.width + srcX + width << 2
        );
      }
    };
    PNG.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
      PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
      return this;
    };
    PNG.adjustGamma = function(src) {
      if (src.gamma) {
        for (let y = 0; y < src.height; y++) {
          for (let x = 0; x < src.width; x++) {
            let idx = src.width * y + x << 2;
            for (let i = 0; i < 3; i++) {
              let sample = src.data[idx + i] / 255;
              sample = Math.pow(sample, 1 / 2.2 / src.gamma);
              src.data[idx + i] = Math.round(sample * 255);
            }
          }
        }
        src.gamma = 0;
      }
    };
    PNG.prototype.adjustGamma = function() {
      PNG.adjustGamma(this);
    };
  }
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/qrcode/lib/renderer/utils.js"(exports) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports.getOptions = function getOptions(options2) {
      if (!options2) options2 = {};
      if (!options2.color) options2.color = {};
      const margin = typeof options2.margin === "undefined" || options2.margin === null || options2.margin < 0 ? 4 : options2.margin;
      const width = options2.width && options2.width >= 21 ? options2.width : void 0;
      const scale = options2.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options2.color.dark || "#000000ff"),
          light: hex2rgba(options2.color.light || "#ffffffff")
        },
        type: options2.type,
        rendererOpts: options2.rendererOpts || {}
      };
    };
    exports.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/qrcode/lib/renderer/png.js
var require_png2 = __commonJS({
  "node_modules/qrcode/lib/renderer/png.js"(exports) {
    var fs = __require("fs");
    var PNG = require_png().PNG;
    var Utils = require_utils2();
    exports.render = function render(qrData, options2) {
      const opts = Utils.getOptions(options2);
      const pngOpts = opts.rendererOpts;
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      pngOpts.width = size;
      pngOpts.height = size;
      const pngImage = new PNG(pngOpts);
      Utils.qrToImageData(pngImage.data, qrData, opts);
      return pngImage;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, options2, cb) {
      if (typeof cb === "undefined") {
        cb = options2;
        options2 = void 0;
      }
      exports.renderToBuffer(qrData, options2, function(err, output) {
        if (err) cb(err);
        let url = "data:image/png;base64,";
        url += output.toString("base64");
        cb(null, url);
      });
    };
    exports.renderToBuffer = function renderToBuffer(qrData, options2, cb) {
      if (typeof cb === "undefined") {
        cb = options2;
        options2 = void 0;
      }
      const png = exports.render(qrData, options2);
      const buffer = [];
      png.on("error", cb);
      png.on("data", function(data) {
        buffer.push(data);
      });
      png.on("end", function() {
        cb(null, Buffer.concat(buffer));
      });
      png.pack();
    };
    exports.renderToFile = function renderToFile(path4, qrData, options2, cb) {
      if (typeof cb === "undefined") {
        cb = options2;
        options2 = void 0;
      }
      let called = false;
      const done = (...args) => {
        if (called) return;
        called = true;
        cb.apply(null, args);
      };
      const stream = fs.createWriteStream(path4);
      stream.on("error", done);
      stream.on("close", done);
      exports.renderToFileStream(stream, qrData, options2);
    };
    exports.renderToFileStream = function renderToFileStream(stream, qrData, options2) {
      const png = exports.render(qrData, options2);
      png.pack().pipe(stream);
    };
  }
});

// node_modules/qrcode/lib/renderer/utf8.js
var require_utf8 = __commonJS({
  "node_modules/qrcode/lib/renderer/utf8.js"(exports) {
    var Utils = require_utils2();
    var BLOCK_CHAR = {
      WW: " ",
      WB: "\u2584",
      BB: "\u2588",
      BW: "\u2580"
    };
    var INVERTED_BLOCK_CHAR = {
      BB: " ",
      BW: "\u2584",
      WW: "\u2588",
      WB: "\u2580"
    };
    function getBlockChar(top, bottom, blocks) {
      if (top && bottom) return blocks.BB;
      if (top && !bottom) return blocks.BW;
      if (!top && bottom) return blocks.WB;
      return blocks.WW;
    }
    exports.render = function(qrData, options2, cb) {
      const opts = Utils.getOptions(options2);
      let blocks = BLOCK_CHAR;
      if (opts.color.dark.hex === "#ffffff" || opts.color.light.hex === "#000000") {
        blocks = INVERTED_BLOCK_CHAR;
      }
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      let output = "";
      let hMargin = Array(size + opts.margin * 2 + 1).join(blocks.WW);
      hMargin = Array(opts.margin / 2 + 1).join(hMargin + "\n");
      const vMargin = Array(opts.margin + 1).join(blocks.WW);
      output += hMargin;
      for (let i = 0; i < size; i += 2) {
        output += vMargin;
        for (let j = 0; j < size; j++) {
          const topModule = data[i * size + j];
          const bottomModule = data[(i + 1) * size + j];
          output += getBlockChar(topModule, bottomModule, blocks);
        }
        output += vMargin + "\n";
      }
      output += hMargin.slice(0, -1);
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
    exports.renderToFile = function renderToFile(path4, qrData, options2, cb) {
      if (typeof cb === "undefined") {
        cb = options2;
        options2 = void 0;
      }
      const fs = __require("fs");
      const utf8 = exports.render(qrData, options2);
      fs.writeFile(path4, utf8, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal.js
var require_terminal = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal.js"(exports) {
    exports.render = function(qrData, options2, cb) {
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const black = "\x1B[40m  \x1B[0m";
      const white = "\x1B[47m  \x1B[0m";
      let output = "";
      const hMargin = Array(size + 3).join(white);
      const vMargin = Array(2).join(white);
      output += hMargin + "\n";
      for (let i = 0; i < size; ++i) {
        output += white;
        for (let j = 0; j < size; j++) {
          output += data[i * size + j] ? black : white;
        }
        output += vMargin + "\n";
      }
      output += hMargin + "\n";
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal-small.js
var require_terminal_small = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal-small.js"(exports) {
    var backgroundWhite = "\x1B[47m";
    var backgroundBlack = "\x1B[40m";
    var foregroundWhite = "\x1B[37m";
    var foregroundBlack = "\x1B[30m";
    var reset = "\x1B[0m";
    var lineSetupNormal = backgroundWhite + foregroundBlack;
    var lineSetupInverse = backgroundBlack + foregroundWhite;
    var createPalette = function(lineSetup, foregroundWhite2, foregroundBlack2) {
      return {
        // 1 ... white, 2 ... black, 0 ... transparent (default)
        "00": reset + " " + lineSetup,
        "01": reset + foregroundWhite2 + "\u2584" + lineSetup,
        "02": reset + foregroundBlack2 + "\u2584" + lineSetup,
        10: reset + foregroundWhite2 + "\u2580" + lineSetup,
        11: " ",
        12: "\u2584",
        20: reset + foregroundBlack2 + "\u2580" + lineSetup,
        21: "\u2580",
        22: "\u2588"
      };
    };
    var mkCodePixel = function(modules, size, x, y) {
      const sizePlus = size + 1;
      if (x >= sizePlus || y >= sizePlus || y < -1 || x < -1) return "0";
      if (x >= size || y >= size || y < 0 || x < 0) return "1";
      const idx = y * size + x;
      return modules[idx] ? "2" : "1";
    };
    var mkCode = function(modules, size, x, y) {
      return mkCodePixel(modules, size, x, y) + mkCodePixel(modules, size, x, y + 1);
    };
    exports.render = function(qrData, options2, cb) {
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const inverse = !!(options2 && options2.inverse);
      const lineSetup = options2 && options2.inverse ? lineSetupInverse : lineSetupNormal;
      const white = inverse ? foregroundBlack : foregroundWhite;
      const black = inverse ? foregroundWhite : foregroundBlack;
      const palette = createPalette(lineSetup, white, black);
      const newLine = reset + "\n" + lineSetup;
      let output = lineSetup;
      for (let y = -1; y < size + 1; y += 2) {
        for (let x = -1; x < size; x++) {
          output += palette[mkCode(data, size, x, y)];
        }
        output += palette[mkCode(data, size, size, y)] + newLine;
      }
      output += reset;
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal.js
var require_terminal2 = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal.js"(exports) {
    var big = require_terminal();
    var small = require_terminal_small();
    exports.render = function(qrData, options2, cb) {
      if (options2 && options2.small) {
        return small.render(qrData, options2, cb);
      }
      return big.render(qrData, options2, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str2 = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str2 + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str2;
    }
    function svgCmd(cmd, x, y) {
      let str2 = cmd + x;
      if (typeof y !== "undefined") str2 += " " + y;
      return str2;
    }
    function qrToPath(data, size, margin) {
      let path4 = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path4 += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i + 1])) {
            path4 += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path4;
    }
    exports.render = function render(qrData, options2, cb) {
      const opts = Utils.getOptions(options2);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path4 = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path4 + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// node_modules/qrcode/lib/renderer/svg.js
var require_svg = __commonJS({
  "node_modules/qrcode/lib/renderer/svg.js"(exports) {
    var svgTagRenderer = require_svg_tag();
    exports.render = svgTagRenderer.render;
    exports.renderToFile = function renderToFile(path4, qrData, options2, cb) {
      if (typeof cb === "undefined") {
        cb = options2;
        options2 = void 0;
      }
      const fs = __require("fs");
      const svgTag = exports.render(qrData, options2);
      const xmlStr = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + svgTag;
      fs.writeFile(path4, xmlStr, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "node_modules/qrcode/lib/renderer/canvas.js"(exports) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + "px";
      canvas.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports.render = function render(qrData, canvas, options2) {
      let opts = options2;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, canvas, options2) {
      let opts = options2;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "node_modules/qrcode/lib/browser.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve4, reject) {
          try {
            const data = QRCode2.create(text, opts);
            resolve4(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports.create = QRCode2.create;
    exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// node_modules/qrcode/lib/server.js
var require_server = __commonJS({
  "node_modules/qrcode/lib/server.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var PngRenderer = require_png2();
    var Utf8Renderer = require_utf8();
    var TerminalRenderer = require_terminal2();
    var SvgRenderer = require_svg();
    function checkParams(text, opts, cb) {
      if (typeof text === "undefined") {
        throw new Error("String required as first argument");
      }
      if (typeof cb === "undefined") {
        cb = opts;
        opts = {};
      }
      if (typeof cb !== "function") {
        if (!canPromise()) {
          throw new Error("Callback required as last argument");
        } else {
          opts = cb || {};
          cb = null;
        }
      }
      return {
        opts,
        cb
      };
    }
    function getTypeFromFilename(path4) {
      return path4.slice((path4.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }
    function getRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "txt":
        case "utf8":
          return Utf8Renderer;
        case "png":
        case "image/png":
        default:
          return PngRenderer;
      }
    }
    function getStringRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "terminal":
          return TerminalRenderer;
        case "utf8":
        default:
          return Utf8Renderer;
      }
    }
    function render(renderFunc, text, params) {
      if (!params.cb) {
        return new Promise(function(resolve4, reject) {
          try {
            const data = QRCode2.create(text, params.opts);
            return renderFunc(data, params.opts, function(err, data2) {
              return err ? reject(err) : resolve4(data2);
            });
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, params.opts);
        return renderFunc(data, params.opts, params.cb);
      } catch (e) {
        params.cb(e);
      }
    }
    exports.create = QRCode2.create;
    exports.toCanvas = require_browser().toCanvas;
    exports.toString = function toString(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const type = params.opts ? params.opts.type : void 0;
      const renderer = getStringRendererFromType(type);
      return render(renderer.render, text, params);
    };
    exports.toDataURL = function toDataURL(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToDataURL, text, params);
    };
    exports.toBuffer = function toBuffer(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToBuffer, text, params);
    };
    exports.toFile = function toFile(path4, text, opts, cb) {
      if (typeof path4 !== "string" || !(typeof text === "string" || typeof text === "object")) {
        throw new Error("Invalid argument");
      }
      if (arguments.length < 3 && !canPromise()) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, cb);
      const type = params.opts.type || getTypeFromFilename(path4);
      const renderer = getRendererFromType(type);
      const renderToFile = renderer.renderToFile.bind(null, path4);
      return render(renderToFile, text, params);
    };
    exports.toFileStream = function toFileStream(stream, text, opts) {
      if (arguments.length < 2) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, stream.emit.bind(stream, "error"));
      const renderer = getRendererFromType("png");
      const renderToFileStream = renderer.renderToFileStream.bind(null, stream);
      render(renderToFileStream, text, params);
    };
  }
});

// node_modules/qrcode/lib/index.js
var require_lib = __commonJS({
  "node_modules/qrcode/lib/index.js"(exports, module) {
    module.exports = require_server();
  }
});

// node_modules/pend/index.js
var require_pend = __commonJS({
  "node_modules/pend/index.js"(exports, module) {
    module.exports = Pend;
    function Pend() {
      this.pending = 0;
      this.max = Infinity;
      this.listeners = [];
      this.waiting = [];
      this.error = null;
    }
    Pend.prototype.go = function(fn) {
      if (this.pending < this.max) {
        pendGo(this, fn);
      } else {
        this.waiting.push(fn);
      }
    };
    Pend.prototype.wait = function(cb) {
      if (this.pending === 0) {
        cb(this.error);
      } else {
        this.listeners.push(cb);
      }
    };
    Pend.prototype.hold = function() {
      return pendHold(this);
    };
    function pendHold(self) {
      self.pending += 1;
      var called = false;
      return onCb;
      function onCb(err) {
        if (called) throw new Error("callback called twice");
        called = true;
        self.error = self.error || err;
        self.pending -= 1;
        if (self.waiting.length > 0 && self.pending < self.max) {
          pendGo(self, self.waiting.shift());
        } else if (self.pending === 0) {
          var listeners = self.listeners;
          self.listeners = [];
          listeners.forEach(cbListener);
        }
      }
      function cbListener(listener) {
        listener(self.error);
      }
    }
    function pendGo(self, fn) {
      fn(pendHold(self));
    }
  }
});

// node_modules/yauzl/fd-slicer.js
var require_fd_slicer = __commonJS({
  "node_modules/yauzl/fd-slicer.js"(exports) {
    var fs = __require("fs");
    var util = __require("util");
    var stream = __require("stream");
    var Readable2 = stream.Readable;
    var PassThrough = stream.PassThrough;
    var Pend = require_pend();
    var EventEmitter = __require("events").EventEmitter;
    exports.BufferSlicer = BufferSlicer;
    exports.FdSlicer = FdSlicer;
    util.inherits(FdSlicer, EventEmitter);
    function FdSlicer(fd) {
      EventEmitter.call(this);
      this.fd = fd;
      this.pend = new Pend();
      this.pend.max = 1;
      this.refCount = 0;
    }
    FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      var self = this;
      self.pend.go(function(cb) {
        fs.read(self.fd, buffer, offset, length, position, function(err, bytesRead, buffer2) {
          cb();
          callback(err, bytesRead, buffer2);
        });
      });
    };
    FdSlicer.prototype.createReadStream = function(options2) {
      return new ReadStream(this, options2);
    };
    FdSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    FdSlicer.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount < 0) throw new Error("invalid unref");
      if (self.refCount > 0) return;
      fs.close(self.fd, onCloseDone);
      function onCloseDone(err) {
        if (err) {
          self.emit("error", err);
        } else {
          self.emit("close");
        }
      }
    };
    util.inherits(ReadStream, Readable2);
    function ReadStream(context, options2) {
      options2 = options2 || {};
      Readable2.call(this, options2);
      this.context = context;
      this.context.ref();
      this.start = options2.start || 0;
      this.endOffset = options2.end;
      this.pos = this.start;
    }
    ReadStream.prototype._read = function(n) {
      var self = this;
      var toRead = Math.min(self._readableState.highWaterMark, n);
      if (self.endOffset != null) {
        toRead = Math.min(toRead, self.endOffset - self.pos);
      }
      if (toRead <= 0) {
        self.push(null);
        this._cleanup();
        return;
      }
      self.context.pend.go(function(cb) {
        var buffer = Buffer.allocUnsafe(toRead);
        fs.read(self.context.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
          if (err) {
            self.destroy(err);
          } else if (bytesRead === 0) {
            self.push(null);
            self._cleanup();
          } else {
            self.pos += bytesRead;
            self.push(buffer.slice(0, bytesRead));
          }
          cb();
        });
      });
    };
    ReadStream.prototype._destroy = function(err, cb) {
      this._cleanup();
      cb(err);
    };
    ReadStream.prototype._cleanup = function() {
      if (this.context != null) {
        this.context.unref();
        this.context = null;
      }
    };
    util.inherits(BufferSlicer, EventEmitter);
    function BufferSlicer(buffer) {
      EventEmitter.call(this);
      this.refCount = 0;
      this.buffer = buffer;
    }
    BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
      if (!(0 <= offset && offset <= buffer.length)) throw new RangeError("offset outside buffer: 0 <= " + offset + " <= " + buffer.length);
      if (position < 0) throw new RangeError("position is negative: " + position);
      if (offset + length > buffer.length) {
        length = buffer.length - offset;
      }
      if (position + length > this.buffer.length) {
        length = this.buffer.length - position;
      }
      if (length <= 0) {
        setImmediate(function() {
          callback(null, 0);
        });
        return;
      }
      this.buffer.copy(buffer, offset, position, position + length);
      setImmediate(function() {
        callback(null, length);
      });
    };
    BufferSlicer.prototype.createReadStream = function(options2) {
      options2 = options2 || {};
      var readStream = new PassThrough(options2);
      readStream.start = options2.start || 0;
      readStream.endOffset = options2.end;
      readStream.pos = readStream.endOffset || this.buffer.length;
      var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
      var maxChunkSize = 65536;
      var offset = 0;
      while (true) {
        var nextOffset = offset + maxChunkSize;
        if (nextOffset >= entireSlice.length) {
          if (offset < entireSlice.length) {
            readStream.write(entireSlice.slice(offset, entireSlice.length));
          }
          break;
        }
        readStream.write(entireSlice.slice(offset, nextOffset));
        offset = nextOffset;
      }
      readStream.end();
      return readStream;
    };
    BufferSlicer.prototype.ref = function() {
      this.refCount += 1;
    };
    BufferSlicer.prototype.unref = function() {
      this.refCount -= 1;
      if (this.refCount < 0) {
        throw new Error("invalid unref");
      }
    };
  }
});

// node_modules/yauzl/crc32.js
var require_crc32 = __commonJS({
  "node_modules/yauzl/crc32.js"(exports, module) {
    var CRC_TABLE = new Int32Array([
      0,
      1996959894,
      3993919788,
      2567524794,
      124634137,
      1886057615,
      3915621685,
      2657392035,
      249268274,
      2044508324,
      3772115230,
      2547177864,
      162941995,
      2125561021,
      3887607047,
      2428444049,
      498536548,
      1789927666,
      4089016648,
      2227061214,
      450548861,
      1843258603,
      4107580753,
      2211677639,
      325883990,
      1684777152,
      4251122042,
      2321926636,
      335633487,
      1661365465,
      4195302755,
      2366115317,
      997073096,
      1281953886,
      3579855332,
      2724688242,
      1006888145,
      1258607687,
      3524101629,
      2768942443,
      901097722,
      1119000684,
      3686517206,
      2898065728,
      853044451,
      1172266101,
      3705015759,
      2882616665,
      651767980,
      1373503546,
      3369554304,
      3218104598,
      565507253,
      1454621731,
      3485111705,
      3099436303,
      671266974,
      1594198024,
      3322730930,
      2970347812,
      795835527,
      1483230225,
      3244367275,
      3060149565,
      1994146192,
      31158534,
      2563907772,
      4023717930,
      1907459465,
      112637215,
      2680153253,
      3904427059,
      2013776290,
      251722036,
      2517215374,
      3775830040,
      2137656763,
      141376813,
      2439277719,
      3865271297,
      1802195444,
      476864866,
      2238001368,
      4066508878,
      1812370925,
      453092731,
      2181625025,
      4111451223,
      1706088902,
      314042704,
      2344532202,
      4240017532,
      1658658271,
      366619977,
      2362670323,
      4224994405,
      1303535960,
      984961486,
      2747007092,
      3569037538,
      1256170817,
      1037604311,
      2765210733,
      3554079995,
      1131014506,
      879679996,
      2909243462,
      3663771856,
      1141124467,
      855842277,
      2852801631,
      3708648649,
      1342533948,
      654459306,
      3188396048,
      3373015174,
      1466479909,
      544179635,
      3110523913,
      3462522015,
      1591671054,
      702138776,
      2966460450,
      3352799412,
      1504918807,
      783551873,
      3082640443,
      3233442989,
      3988292384,
      2596254646,
      62317068,
      1957810842,
      3939845945,
      2647816111,
      81470997,
      1943803523,
      3814918930,
      2489596804,
      225274430,
      2053790376,
      3826175755,
      2466906013,
      167816743,
      2097651377,
      4027552580,
      2265490386,
      503444072,
      1762050814,
      4150417245,
      2154129355,
      426522225,
      1852507879,
      4275313526,
      2312317920,
      282753626,
      1742555852,
      4189708143,
      2394877945,
      397917763,
      1622183637,
      3604390888,
      2714866558,
      953729732,
      1340076626,
      3518719985,
      2797360999,
      1068828381,
      1219638859,
      3624741850,
      2936675148,
      906185462,
      1090812512,
      3747672003,
      2825379669,
      829329135,
      1181335161,
      3412177804,
      3160834842,
      628085408,
      1382605366,
      3423369109,
      3138078467,
      570562233,
      1426400815,
      3317316542,
      2998733608,
      733239954,
      1555261956,
      3268935591,
      3050360625,
      752459403,
      1541320221,
      2607071920,
      3965973030,
      1969922972,
      40735498,
      2617837225,
      3943577151,
      1913087877,
      83908371,
      2512341634,
      3803740692,
      2075208622,
      213261112,
      2463272603,
      3855990285,
      2094854071,
      198958881,
      2262029012,
      4057260610,
      1759359992,
      534414190,
      2176718541,
      4139329115,
      1873836001,
      414664567,
      2282248934,
      4279200368,
      1711684554,
      285281116,
      2405801727,
      4167216745,
      1634467795,
      376229701,
      2685067896,
      3608007406,
      1308918612,
      956543938,
      2808555105,
      3495958263,
      1231636301,
      1047427035,
      2932959818,
      3654703836,
      1088359270,
      936918e3,
      2847714899,
      3736837829,
      1202900863,
      817233897,
      3183342108,
      3401237130,
      1404277552,
      615818150,
      3134207493,
      3453421203,
      1423857449,
      601450431,
      3009837614,
      3294710456,
      1567103746,
      711928724,
      3020668471,
      3272380065,
      1510334235,
      755167117
    ]);
    function crc32(buf) {
      let crc = -1;
      for (let x of buf) {
        crc = CRC_TABLE[(crc ^ x) & 255] ^ crc >>> 8;
      }
      return (crc ^ -1) >>> 0;
    }
    module.exports = crc32;
  }
});

// node_modules/yauzl/index.js
var require_yauzl = __commonJS({
  "node_modules/yauzl/index.js"(exports) {
    var fs = __require("fs");
    var zlib = __require("zlib");
    var fd_slicer = require_fd_slicer();
    var util = __require("util");
    var EventEmitter = __require("events").EventEmitter;
    var Transform3 = __require("stream").Transform;
    var PassThrough = __require("stream").PassThrough;
    var Writable = __require("stream").Writable;
    var crc32 = typeof zlib.crc32 === "function" ? zlib.crc32 : require_crc32();
    exports.open = open5;
    exports.fromFd = fromFd;
    exports.fromBuffer = fromBuffer;
    exports.fromRandomAccessReader = fromRandomAccessReader;
    exports.openPromise = openPromise2;
    exports.fromFdPromise = fromFdPromise;
    exports.fromBufferPromise = fromBufferPromise;
    exports.fromRandomAccessReaderPromise = fromRandomAccessReaderPromise;
    exports.dosDateTimeToDate = dosDateTimeToDate;
    exports.getFileNameLowLevel = getFileNameLowLevel;
    exports.validateFileName = validateFileName;
    exports.parseExtraFields = parseExtraFields;
    exports.ZipFile = ZipFile;
    exports.Entry = Entry;
    exports.LocalFileHeader = LocalFileHeader;
    exports.RandomAccessReader = RandomAccessReader;
    function openPromise2(path4, options2) {
      return new Promise((resolve4, reject) => {
        open5(path4, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve4(zipfile);
        });
      });
    }
    function fromFdPromise(fd, options2) {
      return new Promise((resolve4, reject) => {
        fromFd(fd, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve4(zipfile);
        });
      });
    }
    function fromBufferPromise(buffer, options2) {
      return new Promise((resolve4, reject) => {
        fromBuffer(buffer, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve4(zipfile);
        });
      });
    }
    function fromRandomAccessReaderPromise(reader, totalSize, options2) {
      return new Promise((resolve4, reject) => {
        fromRandomAccessReader(reader, totalSize, { ...options2, lazyEntries: true }, function(err, zipfile) {
          if (err) return reject(err);
          resolve4(zipfile);
        });
      });
    }
    function open5(path4, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs.open(path4, "r", function(err, fd) {
        if (err) return callback(err);
        fromFd(fd, options2, function(err2, zipfile) {
          if (err2) fs.close(fd, defaultCallback);
          callback(err2, zipfile);
        });
      });
    }
    function fromFd(fd, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      fs.fstat(fd, function(err, stats) {
        if (err) return callback(err);
        var reader = new fd_slicer.FdSlicer(fd);
        fromRandomAccessReader(reader, stats.size, options2, callback);
      });
    }
    function fromBuffer(buffer, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      options2.autoClose = false;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      var reader = new fd_slicer.BufferSlicer(buffer);
      fromRandomAccessReader(reader, buffer.length, options2, callback);
    }
    function fromRandomAccessReader(reader, totalSize, options2, callback) {
      if (typeof options2 === "function") {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      if (options2.autoClose == null) options2.autoClose = true;
      if (options2.lazyEntries == null) options2.lazyEntries = false;
      if (options2.decodeStrings == null) options2.decodeStrings = true;
      var decodeStrings = !!options2.decodeStrings;
      if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
      if (options2.strictFileNames == null) options2.strictFileNames = false;
      if (callback == null) callback = defaultCallback;
      if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
      if (totalSize > Number.MAX_SAFE_INTEGER) {
        throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
      }
      reader.ref();
      var eocdrWithoutCommentSize = 22;
      var zip64EocdlSize = 20;
      var maxCommentSize = 65535;
      var bufferSize = Math.min(zip64EocdlSize + eocdrWithoutCommentSize + maxCommentSize, totalSize);
      var buffer = newBuffer(bufferSize);
      var bufferReadStart = totalSize - buffer.length;
      readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function(err) {
        if (err) return callback(err);
        for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
          if (buffer.readUInt32LE(i) !== 101010256) continue;
          var eocdrBuffer = buffer.subarray(i);
          var diskNumber = eocdrBuffer.readUInt16LE(4);
          var entryCount = eocdrBuffer.readUInt16LE(10);
          var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
          var commentLength = eocdrBuffer.readUInt16LE(20);
          var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
          if (commentLength !== expectedCommentLength) {
            return callback(new Error("Invalid comment length. Expected: " + expectedCommentLength + ". Found: " + commentLength + ". Are there extra bytes at the end of the file? Or is the end of central dir signature `PK\u263A\u263B` in the comment?"));
          }
          var comment = decodeStrings ? decodeBuffer(eocdrBuffer.subarray(22), false) : eocdrBuffer.subarray(22);
          if (i - zip64EocdlSize >= 0 && buffer.readUInt32LE(i - zip64EocdlSize) === 117853008) {
            var zip64EocdlBuffer = buffer.subarray(i - zip64EocdlSize, i - zip64EocdlSize + zip64EocdlSize);
            var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
            var zip64EocdrBuffer = newBuffer(56);
            return readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function(err2) {
              if (err2) return callback(err2);
              if (zip64EocdrBuffer.readUInt32LE(0) !== 101075792) {
                return callback(new Error("invalid zip64 end of central directory record signature"));
              }
              diskNumber = zip64EocdrBuffer.readUInt32LE(16);
              if (diskNumber !== 0) {
                return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
              }
              entryCount = readUInt64LE(zip64EocdrBuffer, 32);
              centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
              return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
            });
          }
          if (diskNumber !== 0) {
            return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
          }
          return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
        }
        callback(new Error("End of central directory record signature not found. Either not a zip file, or file is truncated."));
      });
    }
    util.inherits(ZipFile, EventEmitter);
    function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
      var self = this;
      EventEmitter.call(self);
      self.reader = reader;
      self.reader.on("error", function(err) {
        emitError(self, err);
      });
      self.reader.once("close", function() {
        self.emit("close");
      });
      self.readEntryCursor = centralDirectoryOffset;
      self.fileSize = fileSize;
      self.entryCount = entryCount;
      self.comment = comment;
      self.entriesRead = 0;
      self.autoClose = !!autoClose;
      self.lazyEntries = !!lazyEntries;
      self.decodeStrings = !!decodeStrings;
      self.validateEntrySizes = !!validateEntrySizes;
      self.strictFileNames = !!strictFileNames;
      self.isOpen = true;
      self.emittedError = false;
      self.hasEachEntryBeenCalled = false;
      if (!self.lazyEntries) self._readEntry();
    }
    ZipFile.prototype.close = function() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.reader.unref();
    };
    function emitErrorAndAutoClose(self, err) {
      if (self.autoClose) self.close();
      emitError(self, err);
    }
    function emitError(self, err) {
      if (self.emittedError) return;
      self.emittedError = true;
      self.emit("error", err);
    }
    ZipFile.prototype.readEntry = function() {
      if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
      this._readEntry();
    };
    ZipFile.prototype._readEntry = function() {
      var self = this;
      if (self.entryCount === self.entriesRead) {
        setImmediate(function() {
          if (self.autoClose) self.close();
          if (self.emittedError) return;
          self.emit("end");
        });
        return;
      }
      if (self.emittedError) return;
      var buffer = newBuffer(46);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err) {
        if (err) return emitErrorAndAutoClose(self, err);
        if (self.emittedError) return;
        var entry = new Entry();
        var signature = buffer.readUInt32LE(0);
        if (signature !== 33639248) return emitErrorAndAutoClose(self, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
        entry.versionMadeBy = buffer.readUInt16LE(4);
        entry.versionNeededToExtract = buffer.readUInt16LE(6);
        entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
        entry.compressionMethod = buffer.readUInt16LE(10);
        entry.lastModFileTime = buffer.readUInt16LE(12);
        entry.lastModFileDate = buffer.readUInt16LE(14);
        entry.crc32 = buffer.readUInt32LE(16);
        entry.compressedSize = buffer.readUInt32LE(20);
        entry.uncompressedSize = buffer.readUInt32LE(24);
        entry.fileNameLength = buffer.readUInt16LE(28);
        entry.extraFieldLength = buffer.readUInt16LE(30);
        entry.fileCommentLength = buffer.readUInt16LE(32);
        entry.internalFileAttributes = buffer.readUInt16LE(36);
        entry.externalFileAttributes = buffer.readUInt32LE(38);
        entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);
        if (entry.generalPurposeBitFlag & 64) return emitErrorAndAutoClose(self, new Error("strong encryption is not supported"));
        self.readEntryCursor += 46;
        buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
        readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err2) {
          if (err2) return emitErrorAndAutoClose(self, err2);
          if (self.emittedError) return;
          entry.fileNameRaw = buffer.subarray(0, entry.fileNameLength);
          var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
          entry.extraFieldRaw = buffer.subarray(entry.fileNameLength, fileCommentStart);
          entry.fileCommentRaw = buffer.subarray(fileCommentStart, fileCommentStart + entry.fileCommentLength);
          try {
            entry.extraFields = parseExtraFields(entry.extraFieldRaw);
          } catch (err3) {
            return emitErrorAndAutoClose(self, err3);
          }
          if (self.decodeStrings) {
            var isUtf8 = (entry.generalPurposeBitFlag & 2048) !== 0;
            entry.fileComment = decodeBuffer(entry.fileCommentRaw, isUtf8);
            entry.fileName = getFileNameLowLevel(entry.generalPurposeBitFlag, entry.fileNameRaw, entry.extraFields, self.strictFileNames);
            var errorMessage2 = validateFileName(entry.fileName);
            if (errorMessage2 != null) return emitErrorAndAutoClose(self, new Error(errorMessage2));
          } else {
            entry.fileComment = entry.fileCommentRaw;
            entry.fileName = entry.fileNameRaw;
          }
          entry.comment = entry.fileComment;
          self.readEntryCursor += buffer.length;
          self.entriesRead += 1;
          for (var i = 0; i < entry.extraFields.length; i++) {
            var extraField = entry.extraFields[i];
            if (extraField.id !== 1) continue;
            var zip64EiefBuffer = extraField.data;
            var index = 0;
            if (entry.uncompressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include uncompressed size"));
              }
              entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.compressedSize === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include compressed size"));
              }
              entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            if (entry.relativeOffsetOfLocalHeader === 4294967295) {
              if (index + 8 > zip64EiefBuffer.length) {
                return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include relative header offset"));
              }
              entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
              index += 8;
            }
            break;
          }
          if (self.validateEntrySizes && entry.compressionMethod === 0) {
            var expectedCompressedSize = entry.uncompressedSize;
            if (entry.isEncrypted()) {
              expectedCompressedSize += 12;
            }
            if (entry.compressedSize !== expectedCompressedSize) {
              var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
              return emitErrorAndAutoClose(self, new Error(msg));
            }
          }
          self.emit("entry", entry);
          if (!self.lazyEntries) self._readEntry();
        });
      });
    };
    ZipFile.prototype.eachEntry = function() {
      const self = this;
      if (!self.lazyEntries) throw new Error("eachEntry() requires lazyEntries: true");
      if (self.hasEachEntryBeenCalled) throw new Error("eachEntry() must only be called once per ZipFile");
      self.hasEachEntryBeenCalled = true;
      let pendingResolveReject = null;
      self.on("entry", onEntry);
      self.on("end", onEnd);
      self.on("error", onError);
      function cleanup() {
        self.removeListener("entry", onEntry);
        self.removeListener("end", onEnd);
        self.removeListener("error", onError);
        if (self.autoClose) self.close();
      }
      function onEntry(entry) {
        let { resolve: resolve4 } = pendingResolveReject;
        pendingResolveReject = null;
        resolve4({ value: entry });
      }
      function onEnd() {
        let { resolve: resolve4 } = pendingResolveReject;
        pendingResolveReject = null;
        cleanup();
        resolve4({ done: true });
      }
      function onError(err) {
        let { reject } = pendingResolveReject;
        pendingResolveReject = null;
        cleanup();
        reject(err);
      }
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        next() {
          const promise = new Promise((resolve4, reject) => {
            if (pendingResolveReject != null) throw new Error("next() called before previous Promise was resolved.");
            pendingResolveReject = { resolve: resolve4, reject };
          });
          self.readEntry();
          return promise;
        },
        return(value) {
          cleanup();
          return Promise.resolve({ done: true, value });
        },
        throw(value) {
          cleanup();
          return Promise.reject(value);
        }
      };
    };
    ZipFile.prototype.openReadStream = function(entry, options2, callback) {
      var self = this;
      var relativeStart = 0;
      var relativeEnd = entry.compressedSize;
      if (callback == null) {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) {
        options2 = {};
      } else {
        if (options2.decodeFileData === false) {
          if (options2.decrypt != null) {
            throw new Error("cannot use options.decrypt when options.decodeFileData === false");
          }
          if (options2.decompress != null) {
            throw new Error("cannot use options.decompress when options.decodeFileData === false");
          }
        } else {
          if (options2.decrypt != null) {
            if (!entry.isEncrypted()) {
              throw new Error("options.decrypt can only be specified for encrypted entries. See also option decodeFileData.");
            }
            if (options2.decrypt !== false) throw new Error("invalid options.decrypt value: " + options2.decrypt);
            if (entry.isCompressed()) {
              if (options2.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false. See also option decodeFileData.");
            }
          }
          if (options2.decompress != null) {
            if (!entry.isCompressed()) {
              throw new Error("options.decompress can only be specified for compressed entries. See also option decodeFileData.");
            }
            if (!(options2.decompress === false || options2.decompress === true)) {
              throw new Error("invalid options.decompress value: " + options2.decompress);
            }
            decompress = options2.decompress;
          }
        }
        if (options2.start != null) {
          relativeStart = options2.start;
          if (relativeStart < 0) throw new Error("options.start < 0");
          if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
        }
        if (options2.end != null) {
          relativeEnd = options2.end;
          if (relativeEnd < 0) throw new Error("options.end < 0");
          if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
          if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
        }
      }
      var rawMode = options2.decodeFileData === false || // Explicitly requested raw.
      (entry.compressionMethod === 0 || // Naturally without compression.
      entry.compressionMethod === 8 && options2.decompress === false) && (!entry.isEncrypted() || // Naturally without encryption.
      options2.decrypt === false);
      if (options2.start != null || options2.end != null) {
        if (!rawMode) throw new Error("start/end range require options.decodeFileData === false for non-trivial encoded entries.");
      }
      if (!self.isOpen) return callback(new Error("closed"));
      if (entry.isEncrypted() && !rawMode) {
        if (options2.decrypt !== false) return callback(new Error("entry is encrypted, and options.decodeFileData !== false"));
      }
      var decompress;
      if (rawMode) {
        decompress = false;
      } else if (entry.compressionMethod === 8) {
        decompress = options2.decodeFileData !== true;
      } else {
        return callback(new Error("unsupported compression method: " + entry.compressionMethod));
      }
      self.readLocalFileHeader(entry, { minimal: true }, function(err, localFileHeader) {
        if (err) return callback(err);
        self.openReadStreamLowLevel(
          localFileHeader.fileDataStart,
          entry.compressedSize,
          relativeStart,
          relativeEnd,
          decompress,
          entry.uncompressedSize,
          callback
        );
      });
    };
    ZipFile.prototype.openReadStreamLowLevel = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, callback) {
      var self = this;
      var fileDataEnd = fileDataStart + compressedSize;
      var readStream = self.reader.createReadStream({
        start: fileDataStart + relativeStart,
        end: fileDataStart + relativeEnd
      });
      var endpointStream = readStream;
      if (decompress) {
        var destroyed = false;
        var inflateFilter = zlib.createInflateRaw();
        readStream.on("error", function(err) {
          setImmediate(function() {
            if (!destroyed) inflateFilter.emit("error", err);
          });
        });
        readStream.pipe(inflateFilter);
        if (self.validateEntrySizes) {
          endpointStream = new AssertByteCountStream(uncompressedSize);
          inflateFilter.on("error", function(err) {
            setImmediate(function() {
              if (!destroyed) endpointStream.emit("error", err);
            });
          });
          inflateFilter.pipe(endpointStream);
        } else {
          endpointStream = inflateFilter;
        }
        installDestroyFn(endpointStream, function() {
          destroyed = true;
          if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
          readStream.unpipe(inflateFilter);
          readStream.destroy();
        });
      }
      callback(null, endpointStream);
    };
    ZipFile.prototype.readLocalFileHeader = function(entry, options2, callback) {
      var self = this;
      if (callback == null) {
        callback = options2;
        options2 = null;
      }
      if (options2 == null) options2 = {};
      self.reader.ref();
      var buffer = newBuffer(30);
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function(err) {
        try {
          if (err) return callback(err);
          var signature = buffer.readUInt32LE(0);
          if (signature !== 67324752) {
            return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
          }
          var fileNameLength = buffer.readUInt16LE(26);
          var extraFieldLength = buffer.readUInt16LE(28);
          var fileDataStart = entry.relativeOffsetOfLocalHeader + 30 + fileNameLength + extraFieldLength;
          if (fileDataStart + entry.compressedSize > self.fileSize) {
            return callback(new Error("file data overflows file bounds: " + fileDataStart + " + " + entry.compressedSize + " > " + self.fileSize));
          }
          if (options2.minimal) {
            return callback(null, { fileDataStart });
          }
          var localFileHeader = new LocalFileHeader();
          localFileHeader.fileDataStart = fileDataStart;
          localFileHeader.versionNeededToExtract = buffer.readUInt16LE(4);
          localFileHeader.generalPurposeBitFlag = buffer.readUInt16LE(6);
          localFileHeader.compressionMethod = buffer.readUInt16LE(8);
          localFileHeader.lastModFileTime = buffer.readUInt16LE(10);
          localFileHeader.lastModFileDate = buffer.readUInt16LE(12);
          localFileHeader.crc32 = buffer.readUInt32LE(14);
          localFileHeader.compressedSize = buffer.readUInt32LE(18);
          localFileHeader.uncompressedSize = buffer.readUInt32LE(22);
          localFileHeader.fileNameLength = fileNameLength;
          localFileHeader.extraFieldLength = extraFieldLength;
          buffer = newBuffer(fileNameLength + extraFieldLength);
          self.reader.ref();
          readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader + 30, function(err2) {
            try {
              if (err2) return callback(err2);
              localFileHeader.fileName = buffer.subarray(0, fileNameLength);
              localFileHeader.extraField = buffer.subarray(fileNameLength);
              return callback(null, localFileHeader);
            } finally {
              self.reader.unref();
            }
          });
        } finally {
          self.reader.unref();
        }
      });
    };
    ZipFile.prototype.openReadStreamPromise = function(entry, options2) {
      return new Promise((resolve4, reject) => {
        this.openReadStream(entry, options2, function(err, readStream) {
          if (err) return reject(err);
          resolve4(readStream);
        });
      });
    };
    ZipFile.prototype.openReadStreamLowLevelPromise = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize) {
      return new Promise((resolve4, reject) => {
        this.openReadStream(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, function(err, readStream) {
          if (err) return reject(err);
          resolve4(readStream);
        });
      });
    };
    ZipFile.prototype.readLocalFileHeaderPromise = function(entry, options2) {
      return new Promise((resolve4, reject) => {
        this.readLocalFileHeader(entry, options2, function(err, localFileHeader) {
          if (err) return reject(err);
          resolve4(localFileHeader);
        });
      });
    };
    function Entry() {
    }
    Entry.prototype.getLastModDate = function(options2) {
      if (options2 == null) options2 = {};
      if (!options2.forceDosFormat) {
        for (var i = 0; i < this.extraFields.length; i++) {
          var extraField = this.extraFields[i];
          if (extraField.id === 21589) {
            var data = extraField.data;
            if (data.length < 5) continue;
            var flags = data[0];
            var HAS_MTIME = 1;
            if (!(flags & HAS_MTIME)) continue;
            var posixTimestamp = data.readInt32LE(1);
            return new Date(posixTimestamp * 1e3);
          } else if (extraField.id === 10) {
            var data = extraField.data;
            if (data.length !== 32) continue;
            if (data.readUInt16LE(4) !== 1) continue;
            if (data.readUInt16LE(6) !== 24) continue;
            var hundredNanoSecondsSince1601 = data.readUInt32LE(8) + 4294967296 * data.readInt32LE(12);
            var millisecondsSince1970 = hundredNanoSecondsSince1601 / 1e4 - 116444736e5;
            return new Date(millisecondsSince1970);
          }
        }
      }
      return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime, options2.timezone);
    };
    Entry.prototype.canDecodeFileData = function() {
      return !this.isEncrypted() && (this.compressionMethod === 0 || this.compressionMethod === 8);
    };
    Entry.prototype.isEncrypted = function() {
      return (this.generalPurposeBitFlag & 1) !== 0;
    };
    Entry.prototype.isCompressed = function() {
      return this.compressionMethod === 8;
    };
    function LocalFileHeader() {
    }
    function dosDateTimeToDate(date, time, timezone) {
      var day = date & 31;
      var month = (date >> 5 & 15) - 1;
      var year = (date >> 9 & 127) + 1980;
      var millisecond = 0;
      var second = (time & 31) * 2;
      var minute = time >> 5 & 63;
      var hour = time >> 11 & 31;
      if (timezone == null || timezone === "local") {
        return new Date(year, month, day, hour, minute, second, millisecond);
      } else if (timezone === "UTC") {
        return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
      } else {
        throw new Error("unrecognized options.timezone: " + options.timezone);
      }
    }
    function getFileNameLowLevel(generalPurposeBitFlag, fileNameBuffer, extraFields, strictFileNames) {
      var fileName = null;
      for (var i = 0; i < extraFields.length; i++) {
        var extraField = extraFields[i];
        if (extraField.id === 28789) {
          if (extraField.data.length < 6) {
            continue;
          }
          if (extraField.data.readUInt8(0) !== 1) {
            continue;
          }
          var oldNameCrc32 = extraField.data.readUInt32LE(1);
          if (crc32(fileNameBuffer) !== oldNameCrc32) {
            continue;
          }
          fileName = decodeBuffer(extraField.data.subarray(5), true);
          break;
        }
      }
      if (fileName == null) {
        var isUtf8 = (generalPurposeBitFlag & 2048) !== 0;
        fileName = decodeBuffer(fileNameBuffer, isUtf8);
      }
      if (!strictFileNames) {
        fileName = fileName.replace(/\\/g, "/");
      }
      return fileName;
    }
    function validateFileName(fileName) {
      if (fileName.indexOf("\\") !== -1) {
        return "invalid characters in fileName: " + fileName;
      }
      if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
        return "absolute path: " + fileName;
      }
      if (fileName.split("/").indexOf("..") !== -1) {
        return "invalid relative path: " + fileName;
      }
      return null;
    }
    function parseExtraFields(extraFieldBuffer) {
      var extraFields = [];
      var i = 0;
      while (i < extraFieldBuffer.length - 3) {
        var headerId = extraFieldBuffer.readUInt16LE(i + 0);
        var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
        var dataStart = i + 4;
        var dataEnd = dataStart + dataSize;
        if (dataEnd > extraFieldBuffer.length) throw new Error("extra field length exceeds extra field buffer size");
        var dataBuffer = extraFieldBuffer.subarray(dataStart, dataEnd);
        extraFields.push({
          id: headerId,
          data: dataBuffer
        });
        i = dataEnd;
      }
      return extraFields;
    }
    function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
      if (length === 0) {
        return setImmediate(function() {
          callback(null, newBuffer(0));
        });
      }
      reader.read(buffer, offset, length, position, function(err, bytesRead) {
        if (err) return callback(err);
        if (bytesRead < length) {
          return callback(new Error("unexpected EOF"));
        }
        callback();
      });
    }
    util.inherits(AssertByteCountStream, Transform3);
    function AssertByteCountStream(byteCount) {
      Transform3.call(this);
      this.actualByteCount = 0;
      this.expectedByteCount = byteCount;
    }
    AssertByteCountStream.prototype._transform = function(chunk, encoding, cb) {
      this.actualByteCount += chunk.length;
      if (this.actualByteCount > this.expectedByteCount) {
        var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb(null, chunk);
    };
    AssertByteCountStream.prototype._flush = function(cb) {
      if (this.actualByteCount < this.expectedByteCount) {
        var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
        return cb(new Error(msg));
      }
      cb();
    };
    util.inherits(RandomAccessReader, EventEmitter);
    function RandomAccessReader() {
      EventEmitter.call(this);
      this.refCount = 0;
    }
    RandomAccessReader.prototype.ref = function() {
      this.refCount += 1;
    };
    RandomAccessReader.prototype.unref = function() {
      var self = this;
      self.refCount -= 1;
      if (self.refCount > 0) return;
      if (self.refCount < 0) throw new Error("invalid unref");
      self.close(onCloseDone);
      function onCloseDone(err) {
        if (err) return self.emit("error", err);
        self.emit("close");
      }
    };
    RandomAccessReader.prototype.createReadStream = function(options2) {
      if (options2 == null) options2 = {};
      var start = options2.start;
      var end = options2.end;
      if (start === end) {
        var emptyStream = new PassThrough();
        setImmediate(function() {
          emptyStream.end();
        });
        return emptyStream;
      }
      var stream = this._readStreamForRange(start, end);
      var destroyed = false;
      var refUnrefFilter = new RefUnrefFilter(this);
      stream.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) refUnrefFilter.emit("error", err);
        });
      });
      installDestroyFn(refUnrefFilter, function() {
        stream.unpipe(refUnrefFilter);
        refUnrefFilter.unref();
        stream.destroy();
      });
      var byteCounter = new AssertByteCountStream(end - start);
      refUnrefFilter.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) byteCounter.emit("error", err);
        });
      });
      installDestroyFn(byteCounter, function() {
        destroyed = true;
        refUnrefFilter.unpipe(byteCounter);
        refUnrefFilter.destroy();
      });
      return stream.pipe(refUnrefFilter).pipe(byteCounter);
    };
    RandomAccessReader.prototype._readStreamForRange = function(start, end) {
      throw new Error("not implemented");
    };
    RandomAccessReader.prototype.read = function(buffer, offset, length, position, callback) {
      var readStream = this.createReadStream({ start: position, end: position + length });
      var writeStream = new Writable();
      var written = 0;
      writeStream._write = function(chunk, encoding, cb) {
        chunk.copy(buffer, offset + written, 0, chunk.length);
        written += chunk.length;
        cb();
      };
      writeStream.on("finish", callback);
      readStream.on("error", function(error) {
        callback(error);
      });
      readStream.pipe(writeStream);
    };
    RandomAccessReader.prototype.close = function(callback) {
      setImmediate(callback);
    };
    util.inherits(RefUnrefFilter, PassThrough);
    function RefUnrefFilter(context) {
      PassThrough.call(this);
      this.context = context;
      this.context.ref();
      this.unreffedYet = false;
    }
    RefUnrefFilter.prototype._flush = function(cb) {
      this.unref();
      cb();
    };
    RefUnrefFilter.prototype.unref = function(cb) {
      if (this.unreffedYet) return;
      this.unreffedYet = true;
      this.context.unref();
    };
    var cp437 = "\0\u263A\u263B\u2665\u2666\u2663\u2660\u2022\u25D8\u25CB\u25D9\u2642\u2640\u266A\u266B\u263C\u25BA\u25C4\u2195\u203C\xB6\xA7\u25AC\u21A8\u2191\u2193\u2192\u2190\u221F\u2194\u25B2\u25BC !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\u2302\xC7\xFC\xE9\xE2\xE4\xE0\xE5\xE7\xEA\xEB\xE8\xEF\xEE\xEC\xC4\xC5\xC9\xE6\xC6\xF4\xF6\xF2\xFB\xF9\xFF\xD6\xDC\xA2\xA3\xA5\u20A7\u0192\xE1\xED\xF3\xFA\xF1\xD1\xAA\xBA\xBF\u2310\xAC\xBD\xBC\xA1\xAB\xBB\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255D\u255C\u255B\u2510\u2514\u2534\u252C\u251C\u2500\u253C\u255E\u255F\u255A\u2554\u2569\u2566\u2560\u2550\u256C\u2567\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256B\u256A\u2518\u250C\u2588\u2584\u258C\u2590\u2580\u03B1\xDF\u0393\u03C0\u03A3\u03C3\xB5\u03C4\u03A6\u0398\u03A9\u03B4\u221E\u03C6\u03B5\u2229\u2261\xB1\u2265\u2264\u2320\u2321\xF7\u2248\xB0\u2219\xB7\u221A\u207F\xB2\u25A0\xA0";
    function decodeBuffer(buffer, isUtf8) {
      if (isUtf8) {
        return buffer.toString("utf8");
      } else {
        var result = "";
        for (var i = 0; i < buffer.length; i++) {
          result += cp437[buffer[i]];
        }
        return result;
      }
    }
    function readUInt64LE(buffer, offset) {
      var lower32 = buffer.readUInt32LE(offset);
      var upper32 = buffer.readUInt32LE(offset + 4);
      return upper32 * 4294967296 + lower32;
    }
    var newBuffer;
    if (typeof Buffer.allocUnsafe === "function") {
      newBuffer = function(len) {
        return Buffer.allocUnsafe(len);
      };
    } else {
      newBuffer = function(len) {
        return new Buffer(len);
      };
    }
    function installDestroyFn(stream, fn) {
      if (typeof stream.destroy === "function") {
        stream._destroy = function(err, cb) {
          fn();
          if (cb != null) cb(err);
        };
      } else {
        stream.destroy = fn;
      }
    }
    function defaultCallback(err) {
      if (err) throw err;
    }
  }
});

// dist/cli.js
import { randomUUID as randomUUID4 } from "node:crypto";
import { homedir } from "node:os";
import { performance } from "node:perf_hooks";

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
  THREE_DS: 7,
  INSTALL: 8
};
var CliError = class extends Error {
  type;
  exitCode;
  code;
  details;
  constructor(type, message, exitCode, code, details) {
    super(message);
    this.name = "CliError";
    this.type = type;
    this.exitCode = exitCode;
    this.code = code ?? exitCode;
    this.details = details;
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
function paymentStateUnknownError(message, details) {
  return new CliError("payment_state_unknown", message, EXIT_CODES.API, 500, details);
}
function networkError(message) {
  return new CliError("network_error", message, EXIT_CODES.NETWORK);
}
function installError(message) {
  return new CliError("install_error", message, EXIT_CODES.INSTALL);
}

// dist/args.js
var OPTION_DEFINITIONS = [
  { name: "help", flags: "-h, --help" },
  { name: "format", flags: "--format <format>" },
  { name: "dry-run", flags: "--dry-run" },
  { name: "confirm-purchase", flags: "--confirm-purchase" },
  { name: "wait-delivery", flags: "--wait-delivery" },
  { name: "all", flags: "--all" },
  { name: "internal", flags: "--internal" },
  { name: "tippable", flags: "--tippable" },
  { name: "force", flags: "--force" },
  { name: "open", flags: "--open" },
  { name: "customer-id", flags: "--customer-id <id>" },
  { name: "customer-api-key", flags: "--customer-api-key <key>" },
  { name: "timeout", flags: "--timeout <ms>" },
  { name: "email", flags: "--email <email>" },
  { name: "otp", flags: "--otp <email_otp>" },
  { name: "name", flags: "--name <name>" },
  { name: "publisher", flags: "--publisher <publisher>" },
  { name: "version", flags: "--version <versionNo>" },
  { name: "source", flags: "--source <value>" },
  { name: "payment-instrument-id", flags: "--payment-instrument-id <id>" },
  { name: "idempotency-key", flags: "--idempotency-key <key>" },
  { name: "checkout-id", flags: "--checkout-id <id>" },
  { name: "ucp-order-id", flags: "--ucp-order-id <id>" },
  { name: "next-token", flags: "--next-token <token>" },
  { name: "event-only", flags: "--event-only" },
  { name: "endpoint", flags: "--endpoint <url>" },
  { name: "endpont", flags: "--endpont <url>" },
  { name: "merchant-url", flags: "--merchant-url <url>" },
  { name: "product-url", flags: "--product-url <url>" },
  { name: "merchant-name", flags: "--merchant-name <name>" },
  { name: "merchant-category-code", flags: "--merchant-category-code <code>" },
  { name: "order-channel-id", flags: "--order-channel-id <id>" },
  { name: "line-items", flags: "--line-items <json>" },
  { name: "buyer", flags: "--buyer <json>" },
  { name: "metadata", flags: "--metadata <json>" },
  { name: "credential-token", flags: "--credential-token <token>" },
  { name: "merchant-id", flags: "--merchant-id <id>" },
  { name: "product-id", flags: "--product-id <id>" },
  { name: "query", flags: "--query <text>" },
  { name: "language", flags: "--language <tag>" },
  { name: "context", flags: "--context <json>" },
  { name: "filters", flags: "--filters <json>" },
  { name: "signals", flags: "--signals <json>" },
  { name: "attribution", flags: "--attribution <json>" },
  { name: "cursor", flags: "--cursor <cursor>" },
  { name: "request-id", flags: "--request-id <id>" },
  { name: "ucp-agent", flags: "--ucp-agent <value>" },
  { name: "ext", flags: "--ext <json>" },
  { name: "channel-type", flags: "--channel-type <type>" },
  { name: "form-type", flags: "--form-type <type>" },
  { name: "amount", flags: "--amount <amount>" },
  { name: "currency", flags: "--currency <currency>" },
  { name: "instruction-id", flags: "--instruction-id <id>" },
  { name: "mandate-id", flags: "--mandate-id <id>" },
  { name: "session-id", flags: "--session-id <id>" },
  { name: "payment-method-type", flags: "--payment-method-type <type>" },
  { name: "terminal-qr", flags: "--terminal-qr" },
  { name: "order-id", flags: "--order-id <id>" },
  { name: "refund-id", flags: "--refund-id <id>" },
  { name: "purchase-instruction-id", flags: "--purchase-instruction-id <id>" },
  { name: "status", flags: "--status <status>" },
  { name: "valid-only", flags: "--valid-only" },
  { name: "title", flags: "--title <title>" },
  { name: "description", flags: "--description <text>" },
  { name: "effective-until-time", flags: "--effective-until-time <datetime>" },
  { name: "mandates", flags: "--mandates <json>" },
  { name: "mandates-file", flags: "--mandates-file <path>" },
  { name: "products", flags: "--products <json>" },
  { name: "is-recurring", flags: "--is-recurring" },
  { name: "shipping-address", flags: "--shipping-address <json>" },
  { name: "sandbox", flags: "--sandbox" },
  { name: "test", flags: "--test" },
  { name: "extra", flags: "--extra <json>" },
  { name: "max-wait", flags: "--max-wait <seconds>" },
  { name: "limit", flags: "--limit <n>" },
  { name: "page", flags: "--page <n>" },
  { name: "size", flags: "--size <n>" },
  { name: "start-time", flags: "--start-time <datetime>" },
  { name: "end-time", flags: "--end-time <datetime>" },
  { name: "type", flags: "--type <eventType>" },
  { name: "url", flags: "--url <url>" }
];
function parseArgs(argv, options2 = {}) {
  const optionDefinitions = [
    ...OPTION_DEFINITIONS,
    ...options2.optionDefinitions ?? []
  ];
  const multiValueOptions = options2.multiValueOptions ?? /* @__PURE__ */ new Map();
  const preFlags = {};
  const forwarded = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const equalsIndex = token.indexOf("=");
    const rawOption = equalsIndex >= 0 ? token.slice(0, equalsIndex) : token;
    const multiValueName = multiValueOptions.get(rawOption);
    if (multiValueName) {
      const values = [];
      if (equalsIndex >= 0) {
        const inline = token.slice(equalsIndex + 1);
        if (inline) {
          values.push(inline);
        }
      } else {
        while (index + 1 < argv.length && !argv[index + 1]?.startsWith("--")) {
          values.push(argv[index + 1]);
          index += 1;
        }
      }
      if (values.length === 0) {
        throw validationError(`option ${rawOption} requires at least one value`);
      }
      const previous = preFlags[multiValueName];
      preFlags[multiValueName] = [
        ...typeof previous === "string" ? previous.split(",") : [],
        ...values
      ].join(",");
      continue;
    }
    if (token === "--no-watch") {
      preFlags["no-watch"] = true;
      continue;
    }
    if (token === "--watch") {
      preFlags.watch = true;
      continue;
    }
    if (token === "--no-open") {
      preFlags["no-open"] = true;
      continue;
    }
    if (token === "--no-ack") {
      preFlags["no-ack"] = true;
      continue;
    }
    forwarded.push(token);
  }
  const parser = new Command().helpOption(false).allowUnknownOption(true);
  for (const option of optionDefinitions) {
    parser.option(option.flags);
  }
  const { operands, unknown } = parser.parseOptions(forwarded);
  const unknownOption = unknown.find((token) => token.startsWith("-"));
  if (unknownOption) {
    throw validationError(`unknown option: ${unknownOption}`);
  }
  const parsedOptions = parser.opts();
  const flags = { ...preFlags };
  for (const option of optionDefinitions) {
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

// dist/browser-handoff.js
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

// dist/url.js
function httpOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return void 0;
    }
    return url.origin;
  } catch {
    return void 0;
  }
}
function sameHttpOrigin(left, right) {
  const leftOrigin = httpOrigin(left);
  const rightOrigin = httpOrigin(right);
  return leftOrigin !== void 0 && leftOrigin === rightOrigin;
}

// dist/browser-handoff.js
var BROWSER_HANDOFF_CALLBACK_PATH = "/callback";
var CREATE_HANDOFF_PATH = "/agent/cwallet/oauth/browser-handoffs";
var HANDOFF_PAGE_PREFIX = "/oauth/cli-handoff/";
var MAX_HANDOFF_LIFETIME_SECONDS = 300;
var MAX_COMPLETE_URL_LENGTH = 2048;
var OPAQUE_VALUE_PATTERN = /^[A-Za-z0-9._~-]+$/u;
function canUseBrowserHandoff(runtimeConfig) {
  return Boolean(runtimeConfig.authorization && sameHttpOrigin(runtimeConfig.authorization.issuerOrigin, runtimeConfig.baseUrl));
}
async function openBrowserHandoff(options2) {
  if (!options2.open) {
    return completedLaunch(notRequestedBrowserLaunch(), "direct_fallback");
  }
  const target = validateTargetUrl(options2.targetUrl, options2.portalOrigin);
  if (!target) {
    throw new Error("browser handoff target URL is not trusted");
  }
  if (!canUseBrowserHandoff(options2.runtimeConfig)) {
    return directFallback(options2);
  }
  const clock = options2.clock ?? systemClock();
  const bindLoopback = options2.bindLoopback ?? bindRandomLoopback;
  const randomSecret = options2.randomSecret ?? defaultRandomSecret;
  let binding;
  let pending;
  let timeoutHandle;
  let processingCallback = false;
  let completionSettled = false;
  let resolveCompletion = () => {
  };
  const completion = new Promise((resolve4) => {
    resolveCompletion = resolve4;
  });
  const settle = async (status) => {
    if (completionSettled) {
      return;
    }
    completionSettled = true;
    if (timeoutHandle !== void 0) {
      clock.clearTimeout(timeoutHandle);
      timeoutHandle = void 0;
    }
    await binding?.close();
    resolveCompletion(status);
  };
  const handleRequest = async (request, response) => {
    if (completionSettled) {
      sendStatus(response, 410);
      return;
    }
    const currentBinding = binding;
    if (!currentBinding) {
      sendStatus(response, 503);
      return;
    }
    const requestUrl = parseLoopbackRequestUrl(request, currentBinding.origin);
    if (!requestUrl || requestUrl.pathname !== BROWSER_HANDOFF_CALLBACK_PATH) {
      sendStatus(response, 404);
      return;
    }
    if (request.method !== "GET") {
      sendStatus(response, 405);
      return;
    }
    if (!pending) {
      sendStatus(response, 409);
      return;
    }
    if (processingCallback) {
      sendStatus(response, 409);
      return;
    }
    const expectedHost = new URL(currentBinding.origin).host;
    const handoffId = singleQueryValue(requestUrl, "handoff_id");
    const claimId = singleQueryValue(requestUrl, "claim_id");
    const browserNonce = singleQueryValue(requestUrl, "browser_nonce");
    const loopbackState = singleQueryValue(requestUrl, "loopback_state");
    const callbackValid = request.headers.host === expectedHost && handoffId === pending.handoffId && isOpaqueValue(claimId) && isOpaqueValue(browserNonce) && secureEqual(loopbackState, pending.loopbackState);
    if (!callbackValid) {
      await sendRedirect(response, pending.fallbackLoginUrl);
      await settle("email_login_fallback");
      return;
    }
    processingCallback = true;
    try {
      const approved = await options2.request({
        path: `${CREATE_HANDOFF_PATH}/${encodeURIComponent(pending.handoffId)}/approve`,
        body: {
          claim_id: claimId,
          browser_nonce: browserNonce,
          cli_verifier: pending.verifier
        }
      });
      if (!isSuccessfulResponse(approved)) {
        throw new Error("approve rejected");
      }
      await sendRedirect(response, pending.completeUrl);
      await settle("approved");
    } catch {
      await sendRedirect(response, pending.fallbackLoginUrl);
      await settle("email_login_fallback");
    }
  };
  try {
    binding = await bindLoopback((request, response) => {
      void handleRequest(request, response).catch(() => {
        if (!response.headersSent) {
          sendStatus(response, 500);
        } else if (!response.writableEnded) {
          response.end();
        }
        void settle("email_login_fallback");
      });
    });
    const loopbackOrigin = validateLoopbackOrigin(binding.origin);
    if (!loopbackOrigin) {
      await binding.close();
      return directFallback(options2);
    }
    const verifier = randomSecret();
    const loopbackState = randomSecret();
    const loopbackRedirectUri = new URL(BROWSER_HANDOFF_CALLBACK_PATH, loopbackOrigin).toString();
    const created = await options2.request({
      path: CREATE_HANDOFF_PATH,
      body: {
        cli_challenge: s256(verifier),
        loopback_redirect_uri: loopbackRedirectUri,
        loopback_state: loopbackState,
        return_path: target.returnPath
      }
    });
    const createResult = parseCreateResponse(created, target.portalOrigin);
    pending = {
      handoffId: createResult.handoffId,
      verifier,
      loopbackState,
      fallbackLoginUrl: buildFallbackLoginUrl(target.portalOrigin, target.returnPath, options2.email),
      completeUrl: createResult.completeUrl
    };
    timeoutHandle = clock.setTimeout(() => {
      void settle("timeout");
    }, createResult.expiresIn * 1e3);
    const browserLaunch = await safeOpenBrowser(options2.openBrowser, createResult.browserUrl);
    if (browserLaunch.status !== "launched") {
      await settle("direct_fallback");
      const fallbackLaunch = await safeOpenBrowser(options2.openBrowser, options2.targetUrl);
      return { browserLaunch: fallbackLaunch, completion };
    }
    return { browserLaunch, completion };
  } catch {
    await settle("direct_fallback");
    const browserLaunch = await safeOpenBrowser(options2.openBrowser, options2.targetUrl);
    return { browserLaunch, completion };
  }
}
async function bindRandomLoopback(handler) {
  const server = createServer(handler);
  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });
  await new Promise((resolve4, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve4();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen({
      host: "127.0.0.1",
      port: 0,
      exclusive: true
    });
  });
  let closed = false;
  const address = server.address();
  if (!address || address.address !== "127.0.0.1") {
    await closeServer();
    throw new Error("loopback listener did not bind to 127.0.0.1");
  }
  server.on("error", () => {
  });
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: closeServer
  };
  async function closeServer() {
    if (closed) {
      return;
    }
    closed = true;
    if (!server.listening) {
      return;
    }
    await new Promise((resolve4) => {
      server.close(() => resolve4());
      server.closeIdleConnections();
      server.closeAllConnections();
    });
  }
}
function validateTargetUrl(targetUrl, portalOrigin) {
  try {
    const trustedOrigin = new URL(portalOrigin).origin;
    const target = new URL(targetUrl);
    if (target.origin !== trustedOrigin || target.username || target.password) {
      return void 0;
    }
    return {
      portalOrigin: trustedOrigin,
      returnPath: `${target.pathname}${target.search}${target.hash}`
    };
  } catch {
    return void 0;
  }
}
function validateLoopbackOrigin(origin) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1" || !parsed.port || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      return void 0;
    }
    return parsed.origin;
  } catch {
    return void 0;
  }
}
function parseCreateResponse(response, portalOrigin) {
  if (!isSuccessfulResponse(response)) {
    throw new Error("create rejected");
  }
  const data = unwrapData(response.body);
  if (!isRecord(data)) {
    throw new Error("invalid create response");
  }
  const handoffId = requiredOpaqueValue(data.handoff_id);
  const browserUrl = requiredString(data.browser_url);
  const completeUrl = parseCompleteUrl(requiredString(data.complete_url), portalOrigin, handoffId);
  const expiresIn = Number(data.expires_in);
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > MAX_HANDOFF_LIFETIME_SECONDS) {
    throw new Error("invalid create response");
  }
  const actual = new URL(browserUrl);
  const expected = new URL(`${HANDOFF_PAGE_PREFIX}${encodeURIComponent(handoffId)}`, portalOrigin);
  if (actual.origin !== expected.origin || actual.pathname !== expected.pathname || actual.search || actual.hash || actual.username || actual.password) {
    throw new Error("invalid create response");
  }
  if (!completeUrl) {
    throw new Error("invalid create response");
  }
  return {
    handoffId,
    browserUrl: actual.toString(),
    completeUrl,
    expiresIn
  };
}
function parseCompleteUrl(completeUrl, portalOrigin, handoffId) {
  try {
    if (completeUrl.length > MAX_COMPLETE_URL_LENGTH) {
      return void 0;
    }
    const parsed = new URL(completeUrl);
    if (parsed.protocol !== "https:" || parsed.origin !== new URL(portalOrigin).origin || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname === "/") {
      return void 0;
    }
    const lastSegment = parsed.pathname.split("/").at(-1);
    if (!lastSegment || decodeURIComponent(lastSegment) !== handoffId) {
      return void 0;
    }
    const normalized = parsed.toString();
    return normalized.length <= MAX_COMPLETE_URL_LENGTH ? normalized : void 0;
  } catch {
    return void 0;
  }
}
function isSuccessfulResponse(response) {
  if (response.status < 200 || response.status >= 300) {
    return false;
  }
  if (!isRecord(response.body) || !("code" in response.body)) {
    return true;
  }
  const code = Number(response.body.code);
  return code >= 200 && code < 300;
}
function unwrapData(value) {
  return isRecord(value) && "data" in value ? value.data : value;
}
function parseLoopbackRequestUrl(request, loopbackOrigin) {
  try {
    const parsed = new URL(request.url ?? "/", loopbackOrigin);
    return parsed.origin === loopbackOrigin ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function singleQueryValue(url, name) {
  const values = url.searchParams.getAll(name);
  return values.length === 1 ? values[0] : void 0;
}
function requiredOpaqueValue(value) {
  const text = requiredString(value);
  if (!isOpaqueValue(text)) {
    throw new Error("invalid opaque value");
  }
  return text;
}
function requiredString(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("missing string");
  }
  return value.trim();
}
function isOpaqueValue(value) {
  return Boolean(value && value.length <= 256 && OPAQUE_VALUE_PATTERN.test(value));
}
function secureEqual(left, right) {
  if (left === void 0) {
    return false;
  }
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
function s256(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}
function defaultRandomSecret() {
  return randomBytes(32).toString("base64url");
}
function buildFallbackLoginUrl(portalOrigin, returnPath, email) {
  const login = new URL("/login", portalOrigin);
  login.searchParams.set("redirectUrl", returnPath);
  if (email) {
    login.searchParams.set("email", email);
  }
  return login.toString();
}
async function sendRedirect(response, location) {
  if (response.destroyed || response.writableEnded) {
    return;
  }
  await new Promise((resolve4) => {
    const complete = () => resolve4();
    response.once("finish", complete);
    response.once("close", complete);
    response.once("error", complete);
    try {
      response.writeHead(302, {
        "Cache-Control": "no-store",
        Connection: "close",
        Location: location
      });
      response.end();
      if (response.destroyed || response.writableFinished) {
        complete();
      }
    } catch {
      complete();
    }
  });
}
function sendStatus(response, status) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    Connection: "close"
  });
  response.end();
}
async function safeOpenBrowser(openBrowser, url) {
  try {
    return await openBrowser(url);
  } catch {
    return {
      requested: true,
      status: "failed",
      opener: null,
      attempts: []
    };
  }
}
async function directFallback(options2) {
  const browserLaunch = await safeOpenBrowser(options2.openBrowser, options2.targetUrl);
  return completedLaunch(browserLaunch, "direct_fallback");
}
function completedLaunch(browserLaunch, status) {
  return {
    browserLaunch,
    completion: Promise.resolve(status)
  };
}
function notRequestedBrowserLaunch() {
  return {
    requested: false,
    status: "not_requested",
    opener: null,
    attempts: []
  };
}
function systemClock() {
  return {
    setTimeout: (callback, milliseconds) => setTimeout(callback, milliseconds),
    clearTimeout: (handle) => clearTimeout(handle)
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/command-branding.js
var MAIN_EXECUTABLE_NAME = "clink";
var CLI_COMMAND_PATTERN = /\bclink(?= (?:--help|<command>|wallet|card|risk|skills|pay|refund|ucp-checkout|ucp-catalog|ucp-merchant|catalog|ucp-order|instruction|events|tool|config|visa))/gu;
function renderCliCommandText(value, executableName = MAIN_EXECUTABLE_NAME) {
  if (executableName === MAIN_EXECUTABLE_NAME) {
    return value;
  }
  return value.replace(/^clink(?=\r?\n)/u, executableName).replace(CLI_COMMAND_PATTERN, executableName);
}

// dist/auth-identity.js
function runtimeAuthorizationIdentity(config) {
  if (config.authorization) {
    return {
      type: "oauth",
      customerId: config.authorization.customerId,
      deviceId: config.authorization.deviceId,
      issuerOrigin: config.authorization.issuerOrigin,
      ...config.authorization.sessionId ? { sessionId: config.authorization.sessionId } : {}
    };
  }
  if (config.customerApiKey) {
    return {
      type: "csk",
      ...config.customerId ? { customerId: config.customerId } : {},
      customerApiKey: config.customerApiKey,
      baseUrl: config.baseUrl
    };
  }
  return { type: "none" };
}
function authorizationIdentityCanContinue(expected, current) {
  if (expected.type === "none" || current.type === "none") {
    return expected.type === "none" && current.type === "none";
  }
  if (expected.type === "oauth" && current.type === "oauth") {
    return expected.customerId === current.customerId && expected.deviceId === current.deviceId && expected.issuerOrigin === current.issuerOrigin && (expected.sessionId === void 0 || expected.sessionId === current.sessionId);
  }
  if (expected.type === "csk" && current.type === "csk") {
    return (expected.customerId === void 0 || current.customerId === void 0 || expected.customerId === current.customerId) && expected.customerApiKey === current.customerApiKey && sameHttpOrigin(expected.baseUrl, current.baseUrl);
  }
  return expected.type === "csk" && current.type === "oauth" && Boolean(expected.customerId) && expected.customerId === current.customerId && sameHttpOrigin(expected.baseUrl, current.issuerOrigin);
}
function authorizationIdentityCustomerId(identity) {
  return identity.type === "none" ? void 0 : identity.customerId;
}
function storedConfigCanCacheForIdentity(storedConfig, expected) {
  if (expected.type === "none") {
    return false;
  }
  if (storedConfig.authorization) {
    return authorizationIdentityCanContinue(expected, runtimeAuthorizationIdentity(storedRuntimeConfig(storedConfig)));
  }
  if (storedConfig.oauthRequired) {
    return false;
  }
  if (storedConfig.customerId && expected.customerId && storedConfig.customerId !== expected.customerId) {
    return false;
  }
  if (storedConfig.customerApiKey && (expected.type !== "csk" || storedConfig.customerApiKey !== expected.customerApiKey)) {
    return false;
  }
  return true;
}
function storedRuntimeConfig(storedConfig) {
  const runtimeConfig = {
    baseUrl: storedConfig.baseUrl,
    defaultOpenLinks: storedConfig.defaultOpenLinks
  };
  if (storedConfig.authorization) {
    runtimeConfig.customerId = storedConfig.authorization.customerId;
    runtimeConfig.authorization = { ...storedConfig.authorization };
  } else if (!storedConfig.oauthRequired) {
    if (storedConfig.customerId) {
      runtimeConfig.customerId = storedConfig.customerId;
    }
    if (storedConfig.customerApiKey) {
      runtimeConfig.customerApiKey = storedConfig.customerApiKey;
    }
  }
  return runtimeConfig;
}

// dist/config.js
import { randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// dist/domains.js
var API_BASE_URLS = {
  sandbox: "https://uat-api.clinkbill.com",
  test: "https://api.clinkbill.dev",
  production: "https://api.clinkbill.com"
};
function clinkEnvironmentForApiBaseUrl(apiBaseUrl) {
  let origin;
  try {
    origin = new URL(apiBaseUrl).origin;
  } catch {
    return void 0;
  }
  const entries = Object.entries(API_BASE_URLS);
  return entries.find(([, baseUrl]) => new URL(baseUrl).origin === origin)?.[0];
}
var AGENT_BASE_URLS = {
  sandbox: "https://uat-agent.clinkbill.com",
  test: "https://agent.clinkbill.dev",
  production: "https://agent.clinkbill.com"
};
var DASHBOARD_BASE_URLS = {
  sandbox: "https://uat-dashboard.clinkbill.com",
  test: "https://dashboard.clinkbill.dev",
  production: "https://dashboard.clinkbill.com"
};
var DEFAULT_BASE_URL = API_BASE_URLS.production;

// dist/config.js
var CONFIG_DIR = path.join(os.homedir(), ".clink-cli");
var CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
var CONFIG_LOCK_PATH = `${CONFIG_PATH}.lock`;
var WALLET_INIT_GENERATION_PATH = path.join(CONFIG_DIR, "wallet-init-generation");
var CONFIG_LOCK_TIMEOUT_MS = 1e4;
var CONFIG_LOCK_STALE_MS = 5 * 6e4;
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
async function updateStoredConfig(update) {
  return withConfigLock(async () => {
    const current = await readStoredConfig();
    const updated = await update(cloneStoredConfig(current));
    const next = enforceCredentialInvariant(current, updated);
    await writeStoredConfigUnlocked(next);
    return next;
  });
}
async function beginWalletInit(startedAt = Date.now()) {
  if (!Number.isFinite(startedAt) || startedAt < 0) {
    throw configError("wallet init start time is invalid");
  }
  return withConfigLock(async () => {
    const current = await readWalletInitState();
    if (current?.startedAt !== void 0 && current.startedAt > startedAt) {
      return void 0;
    }
    const generation = randomUUID();
    await writeAtomicTextFile(WALLET_INIT_GENERATION_PATH, `${JSON.stringify({ generation, startedAt })}
`, 384);
    return generation;
  });
}
async function isWalletInitCurrent(generation) {
  return (await readWalletInitState())?.generation === generation;
}
async function runIfWalletInitCurrent(generation, operation) {
  return withConfigLock(async () => {
    if ((await readWalletInitState())?.generation !== generation) {
      return false;
    }
    operation();
    return true;
  });
}
function enforceCredentialInvariant(current, next) {
  if (current.oauthRequired || current.authorization || next.oauthRequired || next.authorization) {
    next.oauthRequired = true;
    delete next.customerApiKey;
  }
  return next;
}
function resolveRuntimeConfig(storedConfig, flags) {
  const oauthRequired = Boolean(storedConfig.oauthRequired || storedConfig.authorization);
  const envConfig = compactDefined({
    customerId: process.env.CLINK_CUSTOMER_ID,
    customerApiKey: process.env.CLINK_CUSTOMER_API_KEY
  });
  const flagConfig = compactDefined({
    customerId: getStringFlag(flags, "customer-id"),
    customerApiKey: getStringFlag(flags, "customer-api-key")
  });
  const legacyConfig = {
    ...storedConfig,
    ...envConfig,
    ...flagConfig
  };
  const runtimeConfig = {
    // wallet init persists the selected environment. CLINK_BASE_URL remains available as an
    // advanced process override, but --sandbox/--test are scoped to wallet init.
    baseUrl: process.env.CLINK_BASE_URL ?? storedConfig.baseUrl,
    defaultOpenLinks: storedConfig.defaultOpenLinks
  };
  if (storedConfig.authorization) {
    runtimeConfig.customerId = storedConfig.authorization.customerId;
    runtimeConfig.authorization = { ...storedConfig.authorization };
  } else if (!oauthRequired) {
    assignIfDefined(runtimeConfig, "customerId", legacyConfig.customerId);
    assignIfDefined(runtimeConfig, "customerApiKey", legacyConfig.customerApiKey);
  }
  assignIfDefined(runtimeConfig, "email", storedConfig.email);
  assignIfDefined(runtimeConfig, "name", storedConfig.name);
  return runtimeConfig;
}
function resolveWalletInitBaseUrl(flags) {
  const selectedEnvironment = resolveSelectedEnvironment(flags);
  return (selectedEnvironment ? API_BASE_URLS[selectedEnvironment] : void 0) ?? process.env.CLINK_BASE_URL ?? API_BASE_URLS.production;
}
function resolvePublicCatalogBaseUrl(flags) {
  return API_BASE_URLS[resolveExplicitEnvironment(flags) ?? "production"];
}
function resolveSelectedEnvironment(flags) {
  const explicitEnvironment = resolveExplicitEnvironment(flags);
  const distributionEnvironment = walletInitDistributionEnvironment();
  if (explicitEnvironment && distributionEnvironment && explicitEnvironment !== distributionEnvironment) {
    throw validationError(`wallet init environment is fixed to ${distributionEnvironment} by this CLI distribution`);
  }
  return explicitEnvironment ?? distributionEnvironment;
}
function resolveExplicitEnvironment(flags) {
  const sandbox = getBooleanFlag(flags, "sandbox");
  const test = getBooleanFlag(flags, "test");
  if (sandbox && test) {
    throw validationError("--sandbox and --test cannot be used together");
  }
  return sandbox ? "sandbox" : test ? "test" : void 0;
}
function walletInitDistributionEnvironment() {
  const value = process.env.CLINK_WALLET_INIT_ENVIRONMENT?.trim().toLowerCase();
  if (!value) {
    return void 0;
  }
  if (value === "production" || value === "sandbox" || value === "test") {
    return value;
  }
  throw validationError("invalid CLINK_WALLET_INIT_ENVIRONMENT");
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
  if (key === "baseUrl" && !httpOrigin(rawValue)) {
    throw configError("baseUrl must be an absolute http(s) URL");
  }
  return rawValue;
}
function resolveOpenFlag(storedConfig, flags) {
  if (getBooleanFlag(flags, "no-open")) {
    return false;
  }
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
    ...config.authorization ? { authorization: { ...config.authorization } } : {},
    ...config.paymentMethods ? { paymentMethods: config.paymentMethods.map((item) => ({ ...item })) } : {},
    ...config.riskRules ? { riskRules: config.riskRules.map((item) => ({ ...item })) } : {},
    ...config.visa ? { visa: cloneOpaqueVisaState(config.visa) } : {}
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
  if (isRecord2(record.visa)) {
    config.visa = cloneOpaqueVisaState(record.visa);
  }
  return config;
}
function cloneOpaqueVisaState(state) {
  return structuredClone(state);
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseStoredCustomerState(raw) {
  const customer = {};
  if (typeof raw !== "object" || raw === null) {
    return customer;
  }
  const record = raw;
  assignCustomerString(customer, "customerId", record.customerId);
  assignCustomerString(customer, "customerApiKey", record.customerApiKey ?? record.customerAPIKey);
  const authorization = parseStoredAuthorization(record.authorization, customer.customerId);
  const oauthRequired = record.oauthRequired === true || record.authorization !== void 0;
  if (authorization) {
    customer.authorization = authorization;
    customer.customerId = authorization.customerId;
  }
  if (oauthRequired) {
    customer.oauthRequired = true;
    delete customer.customerApiKey;
  }
  assignCustomerString(customer, "email", record.email);
  assignCustomerString(customer, "name", record.name);
  assignPaymentMethods(customer, record.paymentMethods);
  assignRiskRules(customer, record.riskRules);
  return customer;
}
function assignStoredCustomerState(target, value) {
  assignIfDefined(target, "customerId", value.customerId);
  assignIfDefined(target, "customerApiKey", value.customerApiKey);
  assignIfDefined(target, "authorization", value.authorization ? { ...value.authorization } : void 0);
  assignIfDefined(target, "oauthRequired", value.oauthRequired);
  assignIfDefined(target, "email", value.email);
  assignIfDefined(target, "name", value.name);
  if (value.paymentMethods) {
    target.paymentMethods = value.paymentMethods.map((item) => ({ ...item }));
  }
  if (value.riskRules) {
    target.riskRules = value.riskRules.map((item) => ({ ...item }));
  }
}
function parseStoredAuthorization(raw, fallbackCustomerId) {
  if (typeof raw !== "object" || raw === null) {
    return void 0;
  }
  const record = raw;
  const customerId = nonEmptyString(record.customerId) ?? fallbackCustomerId;
  const customerIdVerified = record.customerIdVerified === true;
  const sessionId = nonEmptyString(record.sessionId);
  const deviceId = nonEmptyString(record.deviceId);
  const issuerOrigin = httpOrigin(nonEmptyString(record.issuerOrigin) ?? "");
  const accessToken = nonEmptyString(record.accessToken);
  const refreshToken = nonEmptyString(record.refreshToken);
  const agentClientId = nonEmptyString(record.agentClientId);
  const visaRegistrationStatus = parseVisaRegistrationStatus(record.visaRegistrationStatus);
  const scope = nonEmptyString(record.scope);
  const accessTokenExpiresAt = finiteNumber(record.accessTokenExpiresAt);
  const refreshTokenExpiresAt = finiteNumber(record.refreshTokenExpiresAt);
  if (!customerId || !deviceId || !issuerOrigin || !accessToken || !refreshToken || !scope || accessTokenExpiresAt === void 0 || refreshTokenExpiresAt === void 0) {
    return void 0;
  }
  return {
    type: "oauth",
    customerId,
    ...customerIdVerified ? { customerIdVerified: true } : {},
    ...sessionId ? { sessionId } : {},
    deviceId,
    issuerOrigin,
    tokenType: "Bearer",
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    ...agentClientId ? { agentClientId } : {},
    ...visaRegistrationStatus ? { visaRegistrationStatus } : {},
    scope
  };
}
function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function parseVisaRegistrationStatus(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const normalized = value.trim().toUpperCase();
  return normalized === "PENDING" || normalized === "REGISTERING" || normalized === "SUCCEEDED" || normalized === "FAILED" || normalized === "UNKNOWN" ? normalized : void 0;
}
async function writeStoredConfigUnlocked(config) {
  await ensureConfigDirectory();
  const tempPath = `${CONFIG_PATH}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(config, null, 2)}
`, {
      encoding: "utf8",
      flag: "wx",
      mode: 384
    });
    if (process.platform !== "win32") {
      await chmod(tempPath, 384);
    }
    await rename(tempPath, CONFIG_PATH);
    if (process.platform !== "win32") {
      await chmod(CONFIG_PATH, 384);
    }
  } finally {
    await rm(tempPath, { force: true });
  }
}
async function writeAtomicTextFile(filePath, content, mode) {
  await ensureConfigDirectory();
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, content, {
      encoding: "utf8",
      flag: "wx",
      mode
    });
    if (process.platform !== "win32") {
      await chmod(tempPath, mode);
    }
    await rename(tempPath, filePath);
    if (process.platform !== "win32") {
      await chmod(filePath, mode);
    }
  } finally {
    await rm(tempPath, { force: true });
  }
}
async function readWalletInitState() {
  try {
    const content = (await readFile(WALLET_INIT_GENERATION_PATH, "utf8")).trim();
    if (!content) {
      return void 0;
    }
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const record = parsed;
        const generation = nonEmptyString(record.generation);
        const startedAt = finiteNumber(record.startedAt);
        if (generation && startedAt !== void 0 && startedAt >= 0) {
          return { generation, startedAt };
        }
      }
    } catch {
    }
    return { generation: content };
  } catch (error) {
    if (error.code === "ENOENT") {
      return void 0;
    }
    throw configError(`failed to read wallet init generation: ${error.message}`);
  }
}
async function withConfigLock(operation) {
  await ensureConfigDirectory();
  const deadline = Date.now() + CONFIG_LOCK_TIMEOUT_MS;
  for (; ; ) {
    let handle;
    try {
      handle = await open(CONFIG_LOCK_PATH, "wx", 384);
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw configError(`failed to lock config file: ${error.message}`);
      }
      await removeStaleConfigLock();
      if (Date.now() >= deadline) {
        throw configError("timed out waiting for config file lock");
      }
      await sleep(100);
      continue;
    }
    try {
      await handle.writeFile(`${process.pid}
${Date.now()}
`, "utf8");
      return await operation();
    } finally {
      await handle.close();
      await rm(CONFIG_LOCK_PATH, { force: true });
    }
  }
}
async function ensureConfigDirectory() {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 448 });
  if (process.platform !== "win32") {
    await chmod(CONFIG_DIR, 448);
  }
}
async function removeStaleConfigLock() {
  try {
    const lockStat = await stat(CONFIG_LOCK_PATH);
    if (Date.now() - lockStat.mtimeMs > CONFIG_LOCK_STALE_MS) {
      await rm(CONFIG_LOCK_PATH, { force: true });
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
function sleep(ms) {
  return new Promise((resolve4) => setTimeout(resolve4, ms));
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

// dist/device-identity.js
import { execFile } from "node:child_process";
import { createHash as createHash2 } from "node:crypto";
import { readFile as readFile2 } from "node:fs/promises";
import os2 from "node:os";

// dist/version.js
var CLI_VERSION = "0.2.31";
var CLI_VERSION_HEADER = "X-Clink-CLI-Version";

// dist/device-identity.js
var DEFAULT_RUNTIME = {
  platform: process.platform,
  architecture: process.arch,
  readTextFile: (filePath) => readFile2(filePath, "utf8"),
  executeFile: execute,
  hostname: os2.hostname,
  osRelease: os2.release
};
async function resolveAgentClientBootstrap(installationId, options2 = {}) {
  const runtime = { ...DEFAULT_RUNTIME, ...options2.runtime };
  const platform = requireSupportedPlatform(runtime.platform);
  const nativeDeviceId = await readNativeDeviceId(platform, runtime);
  const metadata = {
    installationId,
    deviceId: deriveDeviceId(platform, nativeDeviceId),
    clientVersion: CLI_VERSION,
    platform,
    architecture: runtime.architecture
  };
  const hostname = optionalMetadata(runtime.hostname, 255);
  const osRelease = optionalMetadata(runtime.osRelease, 128);
  if (hostname) {
    metadata.hostname = hostname;
  }
  if (osRelease) {
    metadata.osRelease = osRelease;
  }
  return metadata;
}
function deriveDeviceId(platform, nativeDeviceId) {
  const normalized = normalizeNativeDeviceId(nativeDeviceId);
  return createHash2("sha256").update(`${platform}\0${normalized}`, "utf8").digest("hex");
}
async function readNativeDeviceId(platform, runtime) {
  try {
    switch (platform) {
      case "darwin":
        return parseMacDeviceId(await runtime.executeFile("/usr/sbin/ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"]));
      case "win32":
        return parseWindowsDeviceId(await runtime.executeFile("reg.exe", [
          "query",
          "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
          "/v",
          "MachineGuid",
          "/reg:64"
        ]));
      case "linux":
        return readLinuxDeviceId(runtime);
    }
  } catch (error) {
    throw configError(`failed to read the ${platform} native device ID: ${error.message}`);
  }
}
async function readLinuxDeviceId(runtime) {
  const failures = [];
  for (const filePath of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
    try {
      const value = (await runtime.readTextFile(filePath)).trim().toLowerCase();
      if (value && value !== "uninitialized") {
        return value;
      }
      failures.push(`${filePath} is blank or uninitialized`);
    } catch (error) {
      failures.push(`${filePath}: ${error.message}`);
    }
  }
  throw new Error(`no usable Linux machine ID (${failures.join("; ")})`);
}
function parseMacDeviceId(output) {
  const value = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i)?.[1];
  if (!value) {
    throw new Error("ioreg did not return IOPlatformUUID");
  }
  return value;
}
function parseWindowsDeviceId(output) {
  const value = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i)?.[1];
  if (!value) {
    throw new Error("registry query did not return MachineGuid");
  }
  return value;
}
function normalizeNativeDeviceId(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw configError("native device ID must not be blank");
  }
  return normalized;
}
function requireSupportedPlatform(platform) {
  if (platform === "darwin" || platform === "win32" || platform === "linux") {
    return platform;
  }
  throw configError(`Agent Client registration is not supported on ${platform}`);
}
function optionalMetadata(read, maxLength) {
  try {
    const value = read().trim();
    return value ? value.slice(0, maxLength) : void 0;
  } catch {
    return void 0;
  }
}
function execute(filePath, args) {
  return new Promise((resolve4, reject) => {
    execFile(filePath, args, { encoding: "utf8", windowsHide: true }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve4(stdout);
    });
  });
}

// dist/http.js
async function requestJson(options2) {
  const url = new URL(options2.path, ensureTrailingSlash(options2.baseUrl));
  for (const [key, value] of Object.entries(options2.query ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else if (value !== void 0) {
      url.searchParams.set(key, String(value));
    }
  }
  const acceptLanguage = options2.acceptLanguage === void 0 ? "en-US" : options2.acceptLanguage;
  const headers = {
    Accept: "application/json",
    ...acceptLanguage ? { "Accept-Language": acceptLanguage } : {},
    ...options2.headers ?? {}
  };
  if (options2.body !== void 0) {
    headers["Content-Type"] = "application/json";
  }
  setHeader(headers, CLI_VERSION_HEADER, CLI_VERSION);
  if (options2.dryRun) {
    return {
      dryRun: true,
      request: {
        method: options2.method,
        url: url.toString(),
        // Redact credential headers: --dry-run is meant to show request shape, and its output lands
        // in logs / CI / shell history. The CLI never echoes customerApiKey elsewhere (see cli.ts).
        headers: redactSensitiveHeaders(headers),
        body: redactSensitiveBody(options2.body)
      }
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options2.timeoutMs);
  try {
    const init = {
      method: options2.method,
      headers,
      signal: controller.signal
    };
    if (options2.body !== void 0) {
      init.body = JSON.stringify(options2.body);
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
      throw networkError(`request timed out after ${options2.timeoutMs}ms`);
    }
    throw networkError(formatNetworkFailure(error));
  } finally {
    clearTimeout(timeout);
  }
}
function setHeader(headers, name, value) {
  for (const existingName of Object.keys(headers)) {
    if (existingName.toLowerCase() === name.toLowerCase()) {
      delete headers[existingName];
    }
  }
  headers[name] = value;
}
function formatNetworkFailure(error) {
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : "network request failed";
  const cause = isRecord3(error) && isRecord3(error.cause) ? error.cause : void 0;
  if (!cause) {
    return message;
  }
  const details = [
    diagnosticField("code", cause.code),
    diagnosticField("errno", cause.errno),
    diagnosticField("syscall", cause.syscall),
    diagnosticField("hostname", cause.hostname),
    diagnosticField("address", cause.address),
    diagnosticField("port", cause.port)
  ].filter((value) => Boolean(value));
  return details.length > 0 ? `${message} (${details.join(", ")})` : message;
}
function diagnosticField(name, value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return void 0;
  }
  const normalized = String(value).replace(/[\u0000-\u001f\u007f]+/gu, " ").trim().slice(0, 200);
  return normalized ? `${name}=${normalized}` : void 0;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
var SENSITIVE_HEADERS = /* @__PURE__ */ new Set(["x-customer-api-key", "authorization"]);
var SENSITIVE_BODY_KEYS = /* @__PURE__ */ new Set([
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "device_code",
  "deviceCode",
  "device_id",
  "deviceId",
  "installationId",
  "hostname",
  "cli_challenge",
  "cli_verifier",
  "loopback_redirect_uri",
  "loopback_state",
  "return_path",
  "claim_id",
  "browser_nonce",
  "customerApiKey",
  "customerAPIKey"
]);
function redactSensitiveHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => SENSITIVE_HEADERS.has(key.toLowerCase()) && value ? [key, "***"] : [key, value]));
}
function redactSensitiveBody(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveBody);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_BODY_KEYS.has(key) && item ? "***" : redactSensitiveBody(item)
  ]));
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

// dist/oauth-request.js
async function requestJsonWithOAuthRetry(runtime, buildRequest, requester = requestJson) {
  const initialConfig = await runtime.getRuntimeConfig();
  const initialRequest = buildRequest(initialConfig);
  const failedAuthorization = bearerAuthorizationSnapshot(initialConfig, initialRequest);
  const initialResult = await requester(initialRequest);
  if (!failedAuthorization || !runtime.refreshRuntimeConfig || isDryRun(initialResult) || !isUnauthorizedResponse(initialResult)) {
    return initialResult;
  }
  const refreshedConfig = await runtime.refreshRuntimeConfig(failedAuthorization);
  const retryConfig = runtime.reloadRuntimeConfig ? await runtime.reloadRuntimeConfig() : refreshedConfig;
  return requester(buildRequest(retryConfig));
}
function bearerAuthorizationSnapshot(runtimeConfig, request) {
  const authorization = runtimeConfig.authorization;
  if (!authorization) {
    return void 0;
  }
  const authorizationHeader = Object.entries(request.headers ?? {}).find(([name]) => name.toLowerCase() === "authorization")?.[1];
  if (authorizationHeader !== `${authorization.tokenType} ${authorization.accessToken}`) {
    return void 0;
  }
  return {
    accessToken: authorization.accessToken,
    customerId: authorization.customerId,
    issuerOrigin: authorization.issuerOrigin,
    deviceId: authorization.deviceId,
    ...authorization.sessionId ? { sessionId: authorization.sessionId } : {}
  };
}
function isUnauthorizedResponse(response) {
  if (response.status === 401) {
    return true;
  }
  if (typeof response.body !== "object" || response.body === null) {
    return false;
  }
  return Number(response.body.code) === 401;
}
function isDryRun(value) {
  return "dryRun" in value;
}

// dist/utils.js
import { spawn } from "node:child_process";
import path2 from "node:path";
var LOGIN_REQUIRED_MESSAGE = "Login required; run `clink wallet init` to sign in.";
var BROWSER_OPEN_FAILURE_MESSAGE = "Could not open a browser automatically. Open the URL above in any browser.";
var BROWSER_OPEN_COMMAND_TIMEOUT_MS = 5e3;
var BROWSER_OPEN_COMMAND_TERMINATION_GRACE_MS = 250;
function buildCustomerHeaders(config, requestBaseUrl = config.baseUrl) {
  if (config.authorization) {
    assertCredentialRequestOrigin(config, requestBaseUrl);
    return {
      Authorization: `${config.authorization.tokenType} ${config.authorization.accessToken}`
    };
  }
  if (!config.customerId) {
    throw configError(LOGIN_REQUIRED_MESSAGE);
  }
  if (!config.customerApiKey) {
    throw configError(LOGIN_REQUIRED_MESSAGE);
  }
  assertCredentialRequestOrigin(config, requestBaseUrl);
  return {
    "X-Customer-ID": config.customerId,
    "X-Customer-API-Key": config.customerApiKey,
    "X-Timestamp": Date.now().toString()
  };
}
function buildCustomerApiKeyHeaders(config, requestBaseUrl = config.baseUrl) {
  if (config.authorization) {
    assertCredentialRequestOrigin(config, requestBaseUrl);
    return {
      Authorization: `${config.authorization.tokenType} ${config.authorization.accessToken}`
    };
  }
  if (!config.customerApiKey) {
    throw configError(LOGIN_REQUIRED_MESSAGE);
  }
  assertCredentialRequestOrigin(config, requestBaseUrl);
  return {
    "X-Customer-API-Key": config.customerApiKey,
    "X-Timestamp": Date.now().toString()
  };
}
function buildInstructionHeaders(config, requestBaseUrl = config.baseUrl) {
  return buildCustomerApiKeyHeaders(config, requestBaseUrl);
}
function assertCredentialRequestOrigin(config, requestBaseUrl) {
  const requestOrigin = strictCredentialOrigin(requestBaseUrl);
  const walletOrigin = strictCredentialOrigin(config.baseUrl);
  if (requestOrigin !== walletOrigin) {
    throw configError("authenticated request origin does not match the effective wallet API origin (different API environment)");
  }
  if (config.authorization && strictCredentialOrigin(config.authorization.issuerOrigin) !== requestOrigin) {
    throw configError("saved OAuth authorization belongs to a different API environment; run `clink wallet init` for the selected wallet environment");
  }
}
function strictCredentialOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw configError("authenticated requests require an absolute HTTPS API URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    throw configError("authenticated requests require an absolute HTTPS API URL");
  }
  return parsed.origin;
}
function buildAgentPortalUrl(bindingUrl, expectedPortalOrigin, pathname, email) {
  const bindingOrigin = new URL(bindingUrl).origin;
  const trustedOrigin = new URL(expectedPortalOrigin).origin;
  if (!sameHttpOrigin(bindingOrigin, trustedOrigin)) {
    throw configError("card binding URL belongs to an unexpected Portal environment");
  }
  const url = new URL(pathname, trustedOrigin);
  if (email) {
    url.searchParams.set("email", email);
  }
  return url.toString();
}
function resolveAgentBaseUrl(apiBaseUrl) {
  try {
    const url = new URL(apiBaseUrl);
    if (url.origin === API_BASE_URLS.sandbox) {
      return AGENT_BASE_URLS.sandbox;
    }
    if (url.origin === API_BASE_URLS.test) {
      return AGENT_BASE_URLS.test;
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
function resolveDashboardBaseUrl(apiBaseUrl) {
  try {
    const url = new URL(apiBaseUrl);
    if (url.origin === API_BASE_URLS.sandbox) {
      return DASHBOARD_BASE_URLS.sandbox;
    }
    if (url.origin === API_BASE_URLS.test) {
      return DASHBOARD_BASE_URLS.test;
    }
    if (url.origin === API_BASE_URLS.production) {
      return DASHBOARD_BASE_URLS.production;
    }
    const segments = url.hostname.split(".");
    const first = segments[0] ?? "";
    if (/(^|-)api$/i.test(first)) {
      segments[0] = first.replace(/(^|-)api$/i, "$1dashboard");
      url.hostname = segments.join(".");
      return url.origin;
    }
  } catch {
  }
  return DASHBOARD_BASE_URLS.production;
}
function buildAgentPasskeyUrl(agentBaseUrl, paymentInstrumentId, instructionId, email) {
  const url = new URL(`/passkey-auth/${encodeURIComponent(paymentInstrumentId)}`, agentBaseUrl);
  url.searchParams.set("type", "visa");
  if (instructionId) {
    url.searchParams.set("instructionId", instructionId);
  }
  if (email) {
    url.searchParams.set("email", email);
  }
  return url.toString();
}
function maybeOpenBrowser(open5, url, onFailure = (message) => process.stderr.write(`${message}
`)) {
  if (!open5) {
    return;
  }
  let failureReported = false;
  const reportFailure = () => {
    if (failureReported) {
      return;
    }
    failureReported = true;
    onFailure(BROWSER_OPEN_FAILURE_MESSAGE);
  };
  try {
    const command = resolveBrowserOpenCommand(process.platform, url);
    const child = spawn(command.executable, command.args, {
      detached: true,
      stdio: "ignore"
    });
    child.once("error", reportFailure);
    child.once("exit", (code) => {
      if (code !== 0) {
        reportFailure();
      }
    });
    child.unref();
  } catch {
    reportFailure();
  }
}
function resolveBrowserOpenCommand(platform, url, env = process.env) {
  return resolveBrowserOpenCommands(platform, url, env)[0];
}
async function openBrowserWithResult(open5, url, options2 = {}) {
  if (!open5) {
    return {
      requested: false,
      status: "not_requested",
      opener: null,
      attempts: []
    };
  }
  const commands = resolveBrowserOpenCommands(options2.platform ?? process.platform, url, options2.env ?? process.env);
  const launch = options2.launch ?? launchBrowserOpenCommand;
  const attempts = [];
  for (const command of commands) {
    attempts.push(command.executable);
    try {
      await launch(command);
      return {
        requested: true,
        status: "launched",
        opener: command.executable,
        attempts
      };
    } catch {
    }
  }
  (options2.onFailure ?? ((message) => process.stderr.write(`${message}
`)))(BROWSER_OPEN_FAILURE_MESSAGE);
  return {
    requested: true,
    status: "failed",
    opener: null,
    attempts
  };
}
function resolveBrowserOpenCommands(platform, url, env = process.env) {
  if (platform === "darwin") {
    return [{ executable: "open", args: [url] }];
  }
  if (platform === "win32") {
    const windowsDirectory = env.SystemRoot?.trim() || env.WINDIR?.trim();
    const rundll32 = windowsDirectory ? path2.win32.join(windowsDirectory, "System32", "rundll32.exe") : "rundll32.exe";
    const explorer = windowsDirectory ? path2.win32.join(windowsDirectory, "explorer.exe") : "explorer.exe";
    return [
      {
        executable: rundll32,
        args: ["url.dll,FileProtocolHandler", url]
      },
      {
        executable: explorer,
        args: [url]
      }
    ];
  }
  return [
    { executable: "xdg-open", args: [url] },
    { executable: "gio", args: ["open", url] }
  ];
}
async function launchBrowserOpenCommand(command, timeoutMs = BROWSER_OPEN_COMMAND_TIMEOUT_MS) {
  const child = spawn(command.executable, command.args, {
    stdio: "ignore",
    windowsHide: true
  });
  const outcome = new Promise((resolve4) => {
    let reported = false;
    const report = (result2) => {
      if (reported) {
        return;
      }
      reported = true;
      resolve4(result2);
    };
    child.once("error", (error) => report({ type: "error", error }));
    child.once("exit", (code, signal) => report({ type: "exit", code, signal }));
  });
  const waitForOutcome = async (waitMs) => {
    let timeout;
    try {
      return await Promise.race([
        outcome,
        new Promise((resolve4) => {
          timeout = setTimeout(resolve4, waitMs, null);
        })
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  };
  const result = await waitForOutcome(timeoutMs);
  if (result?.type === "error") {
    throw result.error;
  }
  if (result?.type === "exit") {
    if (result.code === 0) {
      return;
    }
    throw new Error(result.signal ? `${command.executable} exited on signal ${result.signal}` : `${command.executable} exited with code ${result.code ?? "unknown"}`);
  }
  const timeoutError = new Error(`${command.executable} timed out after ${timeoutMs}ms`);
  child.kill("SIGTERM");
  if (await waitForOutcome(BROWSER_OPEN_COMMAND_TERMINATION_GRACE_MS)) {
    throw timeoutError;
  }
  child.kill("SIGKILL");
  await outcome;
  throw timeoutError;
}
function parseJsonFlag(value, flagName) {
  try {
    return JSON.parse(value.replace(/^\uFEFF/u, ""));
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
function pickDefaultPaymentMethod(items) {
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
  return preferred;
}
function pickDefaultPaymentInstrument(items) {
  return pickDefaultPaymentMethod(items).paymentInstrumentId;
}

// dist/events.js
var EVENT_POLL_PATH = "/agent/event-hub/webhook-events/poll";
var EVENT_ACK_PATH = "/agent/event-hub/webhook-events/ack";
var DEFAULT_POLL_INTERVAL_MS = 5e3;
var DEFAULT_EVENT_WATCH_DURATION_MS = 15 * 6e4;
var DEFAULT_PAGE_SIZE = 20;
var DEFAULT_COLLECT_POLL_INTERVAL_MS = 2e3;
var DEFAULT_EVENT_COLLECT_DURATION_MS = 6e4;
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
  // The VIC device event remains provisional until its producer contract is verified.
  "vic_device.binding_succeeded",
  // CWallet publishes the purchase-instruction lifecycle events. Matching also accepts the poll
  // record's top-level resourceId because Event Hub may normalize the event-specific payload.
  "purchase_instruction.created",
  "purchase_instruction.activated",
  "purchase_instruction.updated",
  "purchase_instruction.cancelled"
]);
function eventMatchesInstruction(event, instructionId) {
  const expectedInstructionId = resolvedTypedIdentifierAliases([instructionId]);
  const candidate = resolvedTypedIdentifierAliases([
    event.data.instructionId,
    event.data.instruction_id,
    event.data.purchaseInstructionId,
    event.data.purchase_instruction_id,
    event.resourceId
  ]);
  return event.eventType === "purchase_instruction.activated" && expectedInstructionId !== void 0 && candidate === expectedInstructionId;
}
var realSleep = (ms) => new Promise((resolve4) => setTimeout(resolve4, ms));
var stderrLog = (message) => {
  process.stderr.write(`\u2022 ${message}
`);
};
async function pollWebhookEvents(options2) {
  return (await pollWebhookEventPage(options2)).records;
}
async function pollWebhookEventPage(options2) {
  const result = await requestJsonWithOAuthRetry({
    getRuntimeConfig: options2.getRuntimeConfig ?? (() => options2.runtimeConfig),
    ...options2.getRuntimeConfig ? { reloadRuntimeConfig: options2.getRuntimeConfig } : {},
    ...options2.refreshRuntimeConfig ? { refreshRuntimeConfig: options2.refreshRuntimeConfig } : {}
  }, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: EVENT_POLL_PATH,
    headers: buildInstructionHeaders(runtimeConfig),
    body: {
      pageSize: options2.pageSize ?? DEFAULT_PAGE_SIZE,
      ...options2.eventTypes && options2.eventTypes.length > 0 ? { eventTypes: options2.eventTypes } : {},
      ...options2.checkoutId ? { selectors: { checkoutId: options2.checkoutId } } : {},
      ...options2.nextToken ? { nextToken: options2.nextToken } : {}
    },
    timeoutMs: options2.timeoutMs,
    dryRun: false
  }));
  if ("dryRun" in result) {
    return { records: [] };
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  const dataObject = typeof data === "object" && data !== null ? data : void 0;
  const records = dataObject ? dataObject.records : void 0;
  if (!Array.isArray(records)) {
    throw apiError("invalid Event Hub poll response: expected data.records to be an array", 502);
  }
  if (!records.every(isWebhookEventRecord)) {
    throw apiError("invalid Event Hub poll response: expected every record to contain non-empty eventId and eventType", 502);
  }
  const nextTokenValue = dataObject?.nextToken;
  if (nextTokenValue === void 0 || nextTokenValue === null) {
    return { records };
  }
  if (typeof nextTokenValue !== "string" || nextTokenValue.trim().length === 0) {
    throw apiError("invalid Event Hub poll response: expected data.nextToken to be a non-empty string", 502);
  }
  return { records, nextToken: nextTokenValue.trim() };
}
async function ackWebhookEvents(options2, eventIds) {
  const requestedEventIds = [...new Set(eventIds)];
  if (requestedEventIds.length === 0) {
    return [];
  }
  const refreshRuntimeConfig = options2.refreshRuntimeConfig;
  const result = await requestJsonWithOAuthRetry({
    getRuntimeConfig: async () => {
      const runtimeConfig = options2.getRuntimeConfig ? await options2.getRuntimeConfig() : options2.runtimeConfig;
      assertRuntimeIdentity(runtimeConfig, options2.expectedIdentity);
      return runtimeConfig;
    },
    ...options2.getRuntimeConfig ? {
      reloadRuntimeConfig: async () => {
        const runtimeConfig = await options2.getRuntimeConfig();
        assertRuntimeIdentity(runtimeConfig, options2.expectedIdentity);
        return runtimeConfig;
      }
    } : {},
    ...refreshRuntimeConfig ? {
      refreshRuntimeConfig: async (failedAuthorization) => {
        const runtimeConfig = await refreshRuntimeConfig(failedAuthorization);
        assertRuntimeIdentity(runtimeConfig, options2.expectedIdentity);
        return runtimeConfig;
      }
    } : {}
  }, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: EVENT_ACK_PATH,
    headers: buildInstructionHeaders(runtimeConfig),
    body: { eventIds: requestedEventIds },
    timeoutMs: options2.timeoutMs,
    dryRun: false
  }));
  if ("dryRun" in result) {
    return [];
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  if (typeof data !== "object" || data === null) {
    throw apiError("invalid Event Hub ack response: expected data.deletedCount and data.notFoundEventIds", 502);
  }
  const deletedCount = data.deletedCount;
  const notFoundEventIds = data.notFoundEventIds;
  if (!Number.isInteger(deletedCount) || deletedCount < 0 || !Array.isArray(notFoundEventIds) || !notFoundEventIds.every((eventId) => typeof eventId === "string")) {
    throw apiError("invalid Event Hub ack response: expected data.deletedCount and data.notFoundEventIds", 502);
  }
  const requestedEventIdSet = new Set(requestedEventIds);
  const notFoundEventIdSet = new Set(notFoundEventIds);
  if (notFoundEventIdSet.size !== notFoundEventIds.length || notFoundEventIds.some((eventId) => !requestedEventIdSet.has(eventId))) {
    throw apiError("invalid Event Hub ack response: unexpected notFoundEventIds", 502);
  }
  const ackedEventIds = requestedEventIds.filter((eventId) => !notFoundEventIdSet.has(eventId));
  if (ackedEventIds.length !== deletedCount) {
    throw apiError("invalid Event Hub ack response: deletedCount does not match event IDs", 502);
  }
  return ackedEventIds;
}
async function watchEvents(options2) {
  assertValidWatchTarget(options2);
  const pollIntervalMs = options2.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxDurationMs = options2.maxDurationMs ?? DEFAULT_EVENT_WATCH_DURATION_MS;
  const sleep3 = options2.sleep ?? realSleep;
  const now = options2.now ?? Date.now;
  const log = options2.log ?? stderrLog;
  const startedAtMs = now();
  const staleEventCutoffMs = options2.staleEventCutoffMs ?? startedAtMs;
  const ackUnmatchedEvents = options2.ackUnmatchedEvents ?? true;
  const runtimeState = { value: options2.runtimeConfig };
  const getRuntimeConfig = trackRuntimeConfigLoader(runtimeState, options2.getRuntimeConfig);
  const refreshRuntimeConfig = trackRuntimeConfigRefresher(runtimeState, options2.refreshRuntimeConfig);
  const logHandoff = () => {
    log(`Open this link in your browser to complete the ${options2.label}:`);
    log(`  ${options2.url}`);
    log(`Waiting for events (polling every ${Math.round(pollIntervalMs / 1e3)}s, up to ${Math.round(maxDurationMs / 6e4)} min). This will continue automatically once an event arrives.`);
  };
  if (!options2.onReady) {
    logHandoff();
  }
  let ready = false;
  let lastRecoverablePollError;
  let deadline = startedAtMs + maxDurationMs;
  const markReady = () => {
    if (ready) {
      return;
    }
    ready = true;
    if (options2.onReady) {
      deadline = now() + maxDurationMs;
    }
    options2.onReady?.();
    if (options2.onReady) {
      logHandoff();
    }
  };
  for (; ; ) {
    let records;
    let polledIdentity = { type: "none" };
    try {
      records = await pollWebhookEvents({
        runtimeConfig: runtimeState.value,
        ...getRuntimeConfig ? { getRuntimeConfig } : {},
        ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
        timeoutMs: options2.timeoutMs,
        ...options2.pageSize !== void 0 ? { pageSize: options2.pageSize } : {},
        ...options2.eventType && !ackUnmatchedEvents ? { eventTypes: [options2.eventType] } : {}
      });
      polledIdentity = runtimeAuthorizationIdentity(runtimeState.value);
      if (getRuntimeConfig) {
        const currentRuntimeConfig = await getRuntimeConfig();
        assertRuntimeIdentity(currentRuntimeConfig, polledIdentity);
      }
      assertPolledEventCustomers(records, polledIdentity);
      markReady();
    } catch (error) {
      if (!isRecoverableWatchPollError(error)) {
        throw error;
      }
      lastRecoverablePollError = error;
      if (now() + pollIntervalMs >= deadline) {
        break;
      }
      await sleep3(pollIntervalMs);
      continue;
    }
    if (records.length > 0) {
      const staleRecords = records.filter((record) => isStaleForWatch(record, staleEventCutoffMs));
      const currentRecords = records.filter((record) => !isStaleForWatch(record, staleEventCutoffMs));
      const watchTargetEnabled = hasWatchTarget(options2);
      const staleEvents = staleRecords.map(toProcessedEvent);
      const staleAckableEvents = watchTargetEnabled && !ackUnmatchedEvents ? staleEvents.filter((event) => eventMatchesWatchTarget(event, options2)) : staleEvents;
      const staleEventIds = staleAckableEvents.map((event) => event.eventId).filter((id) => id.length > 0);
      if (staleEventIds.length > 0) {
        const ackedStaleEventIds = await ackWebhookEvents({
          runtimeConfig: runtimeState.value,
          ...getRuntimeConfig ? { getRuntimeConfig } : {},
          ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
          expectedIdentity: polledIdentity,
          timeoutMs: options2.timeoutMs
        }, staleEventIds);
        if (ackedStaleEventIds.length > 0) {
          log(`Ignored ${ackedStaleEventIds.length} stale event(s) from before the watch started.`);
        }
      }
      if (currentRecords.length === 0) {
        if (now() + pollIntervalMs >= deadline) {
          break;
        }
        await sleep3(pollIntervalMs);
        continue;
      }
      const events = await processEvents(currentRecords, polledIdentity, options2.resolveStoredRuntimeConfig);
      log(`Received ${events.length} event(s):`);
      for (const event of events) {
        log(`  ${event.summary}`);
      }
      const matchedEvents = watchTargetEnabled ? events.filter((event) => eventMatchesWatchTarget(event, options2)) : events;
      if (watchTargetEnabled && matchedEvents.length === 0) {
        const ignoredEventIds = events.map((event) => event.eventId).filter((id) => id.length > 0);
        if (ackUnmatchedEvents) {
          const ackedIgnoredEventIds = await ackWebhookEvents({
            runtimeConfig: runtimeState.value,
            ...getRuntimeConfig ? { getRuntimeConfig } : {},
            ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
            expectedIdentity: polledIdentity,
            timeoutMs: options2.timeoutMs
          }, ignoredEventIds);
          log(`No event matched the watched resource yet; acknowledged ${ackedIgnoredEventIds.length} unrelated event(s) and continuing to poll.`);
        } else {
          log(`No event matched the watched resource yet; preserved ${ignoredEventIds.length} unrelated event(s) and continuing to poll.`);
        }
        if (now() + pollIntervalMs >= deadline) {
          break;
        }
        await sleep3(pollIntervalMs);
        continue;
      }
      const matchedEventIds = matchedEvents.map((event) => event.eventId).filter((id) => id.length > 0);
      const ackedEventIds = await ackWebhookEvents({
        runtimeConfig: runtimeState.value,
        ...getRuntimeConfig ? { getRuntimeConfig } : {},
        ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
        expectedIdentity: polledIdentity,
        timeoutMs: options2.timeoutMs
      }, matchedEventIds);
      const ackedEventIdSet = new Set(ackedEventIds);
      const acknowledgedEvents = matchedEvents.filter((event) => ackedEventIdSet.has(event.eventId));
      if (acknowledgedEvents.length === 0) {
        log("The matching event was already acknowledged by another watcher; continuing to poll.");
        if (now() + pollIntervalMs >= deadline) {
          break;
        }
        await sleep3(pollIntervalMs);
        continue;
      }
      log(`Acknowledged ${ackedEventIds.length} event(s).`);
      return {
        watched: true,
        url: options2.url,
        timedOut: false,
        events: acknowledgedEvents,
        ackedEventIds
      };
    }
    if (now() + pollIntervalMs >= deadline) {
      break;
    }
    await sleep3(pollIntervalMs);
  }
  if (options2.onReady && !ready && lastRecoverablePollError !== void 0) {
    throw lastRecoverablePollError;
  }
  log(`Timed out after ${Math.round(maxDurationMs / 6e4)} min without receiving any events.`);
  return { watched: true, url: options2.url, timedOut: true, events: [], ackedEventIds: [] };
}
function isStaleForWatch(record, staleEventCutoffMs) {
  const rawEventTime = record.eventTime;
  const eventTimeMs = parseEventTimeMs(rawEventTime);
  if (eventTimeMs === void 0) {
    return false;
  }
  const precisionMs = eventTimePrecisionMs(rawEventTime);
  const comparableCutoffMs = Math.floor(staleEventCutoffMs / precisionMs) * precisionMs;
  return eventTimeMs < comparableCutoffMs;
}
function eventTimePrecisionMs(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value < 1e12 ? 1e3 : 1;
  }
  if (typeof value !== "string") {
    return 1;
  }
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) < 1e12 ? 1e3 : 1;
  }
  const timestamp = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.(\d{1,3}))?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(trimmed);
  if (!timestamp) {
    return 1;
  }
  const fractionalDigits = timestamp[1]?.length ?? 0;
  return fractionalDigits === 0 ? 1e3 : 10 ** (3 - fractionalDigits);
}
function hasWatchTarget(options2) {
  return Boolean(options2.eventType || Object.values(options2.expectedResource ?? {}).some((value) => normalizedValue(value) !== void 0));
}
function eventMatchesWatchTarget(event, options2) {
  if (options2.eventType && event.eventType !== options2.eventType) {
    return false;
  }
  const expectedResource = options2.expectedResource ?? {};
  const expectedEntries = Object.entries(expectedResource).map(([key, value]) => [key, normalizedValue(value)]).filter((entry) => entry[1] !== void 0);
  if (expectedEntries.length === 0) {
    return true;
  }
  const instructionExpectedAliases = [
    expectedResource.instructionId,
    expectedResource.instruction_id,
    expectedResource.purchaseInstructionId,
    expectedResource.purchase_instruction_id
  ];
  if (instructionExpectedAliases.some((value) => value !== void 0)) {
    const expectedInstructionId = resolvedTypedIdentifierAliases(instructionExpectedAliases);
    const eventInstructionId = resolvedTypedIdentifierAliases([
      event.resourceId,
      event.data.instructionId,
      event.data.instruction_id,
      event.data.purchaseInstructionId,
      event.data.purchase_instruction_id
    ]);
    if (expectedInstructionId === void 0 || eventInstructionId !== expectedInstructionId) {
      return false;
    }
    return expectedEntries.filter(([key]) => !isInstructionIdentifierKey(key)).every(([key, value]) => eventFieldValues(event, key).includes(value));
  }
  return expectedEntries.every(([key, value]) => eventFieldValues(event, key).includes(value));
}
function eventFieldValues(event, key) {
  const snakeKey = key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  const identifier = resolvedTypedIdentifierAliases([
    event.data[key],
    event.data[snakeKey],
    key.toLowerCase().endsWith("id") ? event.resourceId : void 0
  ]);
  return identifier === void 0 ? [] : [identifier];
}
function normalizedValue(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function resolvedTypedIdentifierAliases(values) {
  let resolved;
  for (const value of values) {
    if (value === void 0) {
      continue;
    }
    if (typeof value !== "string") {
      return void 0;
    }
    const candidate = value.trim();
    if (!candidate) {
      return void 0;
    }
    if (resolved !== void 0 && resolved !== candidate) {
      return void 0;
    }
    resolved = candidate;
  }
  return resolved;
}
function isInstructionIdentifierKey(key) {
  return key === "instructionId" || key === "instruction_id" || key === "purchaseInstructionId" || key === "purchase_instruction_id";
}
function assertValidWatchTarget(options2) {
  if (options2.eventType !== void 0 && normalizedValue(options2.eventType) === void 0) {
    throw validationError("eventType must be a non-blank string when provided");
  }
  assertValidExpectedResource(options2.expectedResource);
}
function assertValidCollectTarget(options2) {
  if (options2.checkoutId !== void 0 && normalizedValue(options2.checkoutId) === void 0) {
    throw validationError("checkoutId must be a non-blank string when provided");
  }
  if (options2.nextToken !== void 0 && normalizedValue(options2.nextToken) === void 0) {
    throw validationError("nextToken must be a non-blank string when provided");
  }
  if (options2.nextToken !== void 0 && options2.checkoutId === void 0) {
    throw validationError("nextToken requires checkoutId");
  }
  assertValidExpectedResource(options2.expectedResource);
}
function assertValidExpectedResource(expectedResource) {
  if (expectedResource === void 0) {
    return;
  }
  const entries = Object.entries(expectedResource);
  if (entries.length === 0 || entries.some(([, value]) => normalizedValue(value) === void 0)) {
    throw validationError("expectedResource must contain only non-blank string identifiers when provided");
  }
  const instructionAliases = entries.filter(([key]) => isInstructionIdentifierKey(key)).map(([, value]) => value);
  if (instructionAliases.length > 0 && resolvedTypedIdentifierAliases(instructionAliases) === void 0) {
    throw validationError("expectedResource contains conflicting instruction identifiers");
  }
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
function trackRuntimeConfigLoader(runtimeState, getRuntimeConfig) {
  if (!getRuntimeConfig) {
    return void 0;
  }
  return async () => {
    const loaded = await getRuntimeConfig();
    runtimeState.value = loaded;
    return loaded;
  };
}
function trackRuntimeConfigRefresher(runtimeState, refreshRuntimeConfig) {
  if (!refreshRuntimeConfig) {
    return void 0;
  }
  return async (failedAuthorization) => {
    const refreshed = await refreshRuntimeConfig(failedAuthorization);
    runtimeState.value = refreshed;
    return refreshed;
  };
}
async function collectWebhookEvents(options2) {
  assertValidCollectTarget(options2);
  const pollIntervalMs = options2.pollIntervalMs ?? DEFAULT_COLLECT_POLL_INTERVAL_MS;
  const maxDurationMs = options2.maxDurationMs ?? DEFAULT_EVENT_COLLECT_DURATION_MS;
  const ack = options2.ack ?? true;
  const sleep3 = options2.sleep ?? realSleep;
  const now = options2.now ?? Date.now;
  const requestedTypes = new Set((options2.type ?? "").split(",").map((type) => type.trim()).filter((type) => type.length > 0));
  const hasTypeFilter = requestedTypes.size > 0;
  const matchesRequestedType = (event) => requestedTypes.has(event.eventType);
  const checkoutId = normalizedValue(options2.checkoutId);
  const hasCheckoutFilter = checkoutId !== void 0;
  const effectivePageSize = options2.pageSize ?? DEFAULT_PAGE_SIZE;
  const checkoutEventType = [...requestedTypes][0];
  if (hasCheckoutFilter && (requestedTypes.size !== 1 || checkoutEventType !== "agent_order.succeeded" && checkoutEventType !== "agent_order.failed")) {
    throw new CliError("validation_error", "checkoutId requires exactly one agent_order.succeeded or agent_order.failed event type", 2);
  }
  const hasResourceFilter = Object.values(options2.expectedResource ?? {}).some((value) => normalizedValue(value) !== void 0);
  const matchesExpectedResource = (event) => !hasResourceFilter || eventMatchesExpectedResource(event, options2.expectedResource ?? {});
  const matchesTarget = (event, sourceRecord) => (!hasTypeFilter || matchesRequestedType(event)) && (!hasCheckoutFilter || recordMatchesCheckoutId(sourceRecord, checkoutId) && recordHasConsistentPaymentOrderIdAliases(sourceRecord)) && matchesExpectedResource(event);
  const runtimeState = { value: options2.runtimeConfig };
  const getRuntimeConfig = trackRuntimeConfigLoader(runtimeState, options2.getRuntimeConfig);
  const refreshRuntimeConfig = trackRuntimeConfigRefresher(runtimeState, options2.refreshRuntimeConfig);
  const collected = [];
  const ackedEventIds = [];
  let checkoutNextToken = normalizedValue(options2.nextToken);
  const targetReached = () => collected.length > 0;
  const processPolledRecords = async (records) => {
    if (records.length === 0) {
      return false;
    }
    const polledIdentity = runtimeAuthorizationIdentity(runtimeState.value);
    const events = await processEvents(records, polledIdentity, options2.resolveStoredRuntimeConfig);
    const matchingEvents = events.flatMap((event, index) => {
      if (!matchesTarget(event, records[index])) {
        return [];
      }
      return [hasCheckoutFilter ? { ...event, data: { ...event.data, checkoutId } } : event];
    });
    const ackable = hasCheckoutFilter ? ack ? matchingEvents : [] : hasResourceFilter ? events.filter((event) => hasTypeFilter && !matchesRequestedType(event) ? true : ack && matchesTarget(event)) : hasTypeFilter ? events.filter((event) => ack || !matchesRequestedType(event)) : ack ? events : [];
    const ids = ackable.map((event) => event.eventId).filter((id) => id.length > 0);
    const confirmedAckedEventIds = await ackWebhookEvents({
      runtimeConfig: runtimeState.value,
      ...getRuntimeConfig ? { getRuntimeConfig } : {},
      ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
      expectedIdentity: polledIdentity,
      timeoutMs: options2.timeoutMs
    }, ids);
    ackedEventIds.push(...confirmedAckedEventIds);
    if (ack) {
      const confirmedAckedEventIdSet = new Set(confirmedAckedEventIds);
      collected.push(...matchingEvents.filter((event) => confirmedAckedEventIdSet.has(event.eventId)));
    } else {
      collected.push(...matchingEvents);
    }
    return targetReached();
  };
  const deadline = now() + maxDurationMs;
  for (; ; ) {
    const page = hasCheckoutFilter ? await pollWebhookEventPage({
      runtimeConfig: runtimeState.value,
      ...getRuntimeConfig ? { getRuntimeConfig } : {},
      ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
      timeoutMs: options2.timeoutMs,
      pageSize: effectivePageSize,
      eventTypes: [...requestedTypes],
      checkoutId,
      ...checkoutNextToken ? { nextToken: checkoutNextToken } : {}
    }) : {
      records: await pollWebhookEvents({
        runtimeConfig: runtimeState.value,
        ...getRuntimeConfig ? { getRuntimeConfig } : {},
        ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
        timeoutMs: options2.timeoutMs,
        pageSize: effectivePageSize,
        ...hasTypeFilter ? { eventTypes: [...requestedTypes] } : {}
      })
    };
    const records = page.records;
    if (await processPolledRecords(records)) {
      return { ready: true, timedOut: false, events: collected, ackedEventIds };
    }
    if (hasCheckoutFilter) {
      if (page.nextToken !== void 0) {
        if (records.length > 0 && page.nextToken === checkoutNextToken) {
          throw apiError("Event Hub checkout selector returned a non-advancing nextToken", 502);
        }
        checkoutNextToken = page.nextToken;
      } else if (records.length >= effectivePageSize) {
        throw apiError("Event Hub checkout selector returned a full page without nextToken; cursor-backed selector support is required", 502);
      }
    }
    if (now() + pollIntervalMs >= deadline) {
      break;
    }
    await sleep3(pollIntervalMs);
  }
  return {
    ready: false,
    timedOut: true,
    events: collected,
    ackedEventIds,
    ...checkoutNextToken ? { nextToken: checkoutNextToken } : {}
  };
}
function recordMatchesCheckoutId(record, expectedCheckoutId) {
  const payload = strictPayloadObject(record?.payload);
  if (!payload) {
    return false;
  }
  const dataValue = strictObjectValue(payload, "data");
  const data = isRecord4(dataValue) ? dataValue : void 0;
  return resolvedTypedIdentifierAliases([
    ...dataValue === null ? [null] : [],
    data?.checkoutId,
    data?.checkout_id,
    strictNestedValue(payload, ["requestParams", "extra", "agentInstructionInfo", "ucpCheckoutId"]),
    ...data ? [
      strictNestedValue(data, ["requestParams", "extra", "agentInstructionInfo", "ucpCheckoutId"])
    ] : []
  ]) === expectedCheckoutId;
}
function recordHasConsistentPaymentOrderIdAliases(record) {
  const payload = strictPayloadObject(record?.payload);
  if (!payload) {
    return false;
  }
  const dataValue = strictObjectValue(payload, "data");
  const data = isRecord4(dataValue) ? dataValue : void 0;
  const paymentData = data ?? (dataValue === void 0 ? payload : void 0);
  const aliases = [
    record?.resourceId,
    ...dataValue === null ? [null] : [],
    paymentData?.resourceId,
    paymentData?.resource_id,
    paymentData?.orderId,
    paymentData?.order_id,
    paymentData?.paymentOrderId,
    paymentData?.payment_order_id
  ];
  return aliases.every((value) => value === void 0) || resolvedTypedIdentifierAliases(aliases) !== void 0;
}
function strictObjectValue(record, key) {
  if (!(key in record)) {
    return void 0;
  }
  const value = record[key];
  return isRecord4(value) ? value : null;
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strictNestedValue(record, path4) {
  let current = record;
  for (const key of path4) {
    if (!isRecord4(current)) {
      return null;
    }
    if (!(key in current)) {
      return void 0;
    }
    current = current[key];
  }
  return current;
}
function strictPayloadObject(payload) {
  if (!payload) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload);
    return isRecord4(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function eventMatchesExpectedResource(event, expectedResource) {
  const expectedEntries = Object.entries(expectedResource).map(([key, value]) => [key, normalizedValue(value)]).filter((entry) => entry[1] !== void 0);
  if (expectedEntries.length === 0) {
    return true;
  }
  return expectedEntries.every(([key, value]) => eventFieldValues(event, key).includes(value));
}
async function processEvents(records, expectedIdentity, resolveStoredRuntimeConfig = storedRuntimeConfig) {
  const events = records.map(toProcessedEvent);
  await updateStoredConfig((current) => {
    if (expectedIdentity) {
      assertEventCacheIdentity(current, events, expectedIdentity, resolveStoredRuntimeConfig);
    }
    for (const event of events) {
      applyEventToConfig(current, event);
    }
    return current;
  });
  return events;
}
function assertEventCacheIdentity(current, events, expectedIdentity, resolveStoredRuntimeConfig) {
  const currentIdentity = runtimeAuthorizationIdentity(resolveStoredRuntimeConfig(current));
  if (expectedIdentity.type === "none" || !storedConfigCanCacheForIdentity(current, expectedIdentity) || !authorizationIdentityCanContinue(expectedIdentity, currentIdentity)) {
    throw authError("Wallet login changed while webhook events were in progress; retry the command.");
  }
  const expectedCustomerId = authorizationIdentityCustomerId(expectedIdentity);
  const mismatchedEvent = events.find((event) => eventCustomerIds(event).some((customerId) => expectedCustomerId !== void 0 && customerId !== expectedCustomerId) || eventCustomerIds(event).length > 1);
  if (mismatchedEvent) {
    throw authError("Webhook event customer does not match the authenticated wallet; retry the command.");
  }
}
function assertRuntimeIdentity(runtimeConfig, expectedIdentity) {
  if (!expectedIdentity) {
    return;
  }
  if (!authorizationIdentityCanContinue(expectedIdentity, runtimeAuthorizationIdentity(runtimeConfig))) {
    throw authError("Wallet login changed while webhook events were in progress; retry the command.");
  }
}
function assertPolledEventCustomers(records, expectedIdentity) {
  const expectedCustomerId = authorizationIdentityCustomerId(expectedIdentity);
  if (!expectedCustomerId) {
    return;
  }
  const mismatchedEvent = records.map(toProcessedEvent).find((event) => {
    const customerIds = eventCustomerIds(event);
    return customerIds.length > 1 || customerIds.some((customerId) => customerId !== expectedCustomerId);
  });
  if (mismatchedEvent) {
    throw authError("Webhook event customer does not match the authenticated wallet; retry the command.");
  }
}
function eventCustomerIds(event) {
  const customerIds = [event.customerId, asString(event.data.customerId)];
  if (event.eventType === "risk_rule.updated") {
    customerIds.push(event.resourceId);
  }
  return [...new Set(customerIds.filter((value) => Boolean(value)))];
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
  return typeof value === "object" && value !== null && typeof value.eventId === "string" && value.eventId.trim().length > 0 && typeof value.eventType === "string" && value.eventType.trim().length > 0;
}
function str(data, key, fallback) {
  return asString(data[key]) ?? fallback ?? "unknown";
}
function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}

// dist/help.js
var HELP_OPTION = `  --help, -h                    Show this help`;
var OUTPUT_OPTIONS = `  --format <json|pretty>        Output format, defaults to json
${HELP_OPTION}`;
var TOOL_NETWORK_OPTIONS = `  --timeout <ms>                Request timeout in milliseconds
${OUTPUT_OPTIONS}`;
var CUSTOMER_AUTH_OPTIONS = `  --customer-id <id>            Override customer ID
  --customer-api-key <key>      Legacy API key override for never-OAuth wallets only`;
var CUSTOMER_API_KEY_OPTIONS = `  --customer-api-key <key>      Legacy API key override for never-OAuth wallets only`;
var CUSTOMER_REQUEST_OPTIONS = `${CUSTOMER_AUTH_OPTIONS}
  --timeout <ms>                Request timeout in milliseconds
  --dry-run                     Print the request without executing it
${OUTPUT_OPTIONS}`;
var CUSTOMER_API_KEY_REQUEST_OPTIONS = `${CUSTOMER_API_KEY_OPTIONS}
  --timeout <ms>                Request timeout in milliseconds
  --dry-run                     Print the request without executing it
${OUTPUT_OPTIONS}`;
var PUBLIC_CATALOG_ENVIRONMENT_OPTIONS = `  --sandbox                    Use the sandbox/UAT API for this command
  --test                       Use the test API for this command; cannot be combined with --sandbox`;
var PUBLIC_CATALOG_REQUEST_OPTIONS = `${PUBLIC_CATALOG_ENVIRONMENT_OPTIONS}
  --timeout <ms>                Request timeout in milliseconds
  --dry-run                     Print the request without executing it
${OUTPUT_OPTIONS}`;
var PUBLIC_CATALOG_LIST_OPTIONS = `${PUBLIC_CATALOG_ENVIRONMENT_OPTIONS}
  --timeout <ms>                Request timeout in milliseconds
${OUTPUT_OPTIONS}`;
var CUSTOMER_API_KEY_LINK_OPTIONS = `${CUSTOMER_API_KEY_OPTIONS}
  --timeout <ms>                Request timeout in milliseconds
  --open                        Open the generated link in the browser
  --no-watch                    Do not poll for webhook events after printing the link
  --dry-run                     Print the link without polling for webhook events
${OUTPUT_OPTIONS}`;
var ROOT_HELP = `clink

Clink customer wallet CLI.

Usage:
  clink <command> [subcommand] [options]

Commands:
  wallet            Initialize wallet and inspect local wallet status
  card              Generate card links and manage payment methods
  risk              Inspect or open risk rule settings
  skills            Discover, install, and tip skills
  pay               Charge a payment instrument
  refund            Create refund and query refund status
  ucp-checkout      Manage UCP checkout sessions for shadow merchants
  ucp-catalog       Search merchant UCP catalogs
  ucp-merchant      Discover enabled UCP merchants
  catalog           Search catalogs across merchants without naming one
  ucp-order         Query UCP orders and wait for digital delivery
  instruction       Manage purchase instruction mandates (agentic authorization)
  events            Poll the webhook-event queue for state-change events
  tool              Utility tools for UCP and checkout workflows
  config            Read and update local config

Global Options:
  --format <json|pretty>        Output format
  --dry-run                     Print request without executing
  --open                        Open generated link in browser
  --no-open                     Do not open generated links; overrides --open and saved defaults
  --no-watch                    Do not poll for webhook events after printing a link
  --customer-id <id>            Override customer ID for authenticated commands
  --customer-api-key <key>      Legacy API key override for authenticated never-OAuth wallets only
  --timeout <ms>                Request timeout in milliseconds
  --help, -h                    Show help

Wallet Environment:
  Select an official environment with wallet init: --sandbox uses sandbox and --test uses test.
  The main distribution uses production when neither is present; packaged distributions may fix
  their wallet-init environment internally. Successful initialization saves the environment, and
  later authenticated commands use it without --sandbox or --test. CLINK_BASE_URL remains an advanced
  process override for those authenticated commands.

Public Discovery Environment:
  ucp-catalog search/product, catalog search, ucp-merchant list, and the legacy
  tool internal-ucp get-merchant-list command are public and config-independent. They default to
  production and accept --sandbox or --test per call.

Event Watching:
  Link commands normally print the browser handoff and then poll
  /agent/event-hub/webhook-events/poll (pageSize=20, every 5s up to 15 min),
  process events (logging progress to stderr and updating the local cache), ACK
  the records consumed by that workflow, and print a watch envelope to stdout.
  card binding-link is readiness-gated: it first starts a server-side
  payment_method.added selector, then prints its sanitized Portal handoff, and ACKs only
  the matching event. Pass --no-watch to skip polling (for scripted or
  non-interactive use, including card binding-link refreshes). To pull state
  changes on demand without printing a link, use 'clink events poll'
  (see 'clink events --help').

Examples:
  clink wallet init --email alice@example.com
  clink wallet init --sandbox --email alice@example.com
  clink wallet init --test --email alice@example.com
  clink wallet status --format pretty
  clink card setup-link --open
  clink skills list --all --format pretty
  clink skills tip --publisher clinkpay --name PollyReach --amount 2
  clink pay --merchant-id merchant_xxx --amount 10 --currency USD --payment-instrument-id pi_xxx
  clink ucp-catalog search --merchant-id merchant_xxx --query keyboard --format json
  clink ucp-merchant list --internal --format json
  clink catalog search --query "iced latte" --format json
  clink ucp-checkout get --checkout-id chk_xxx
  clink ucp-order get --order-id order_xxx
  clink ucp-order wait-delivery --order-id order_xxx --max-wait 900
  clink ucp-order list --status paid --start-time 2026-07-01T00:00:00Z
  clink tool item-id --url https://shop.example/products/t-shirt?variant=123
  clink refund create --order-id order_xxx

More Help:
  clink wallet --help
  clink card --help
  clink skills --help
  clink ucp-catalog --help
  clink ucp-merchant --help
  clink catalog --help
  clink ucp-checkout --help
  clink ucp-order --help
  clink refund --help
  clink instruction --help
  clink events --help
  clink tool --help
  clink config --help
`;
var SKILLS_HELP = `clink skills

Usage:
  clink skills <list|install|tip> [options]

Actions:
  list              List all public skills in reversed NEW order with one-based Number fields
  install           Download and install a skill package into local agent skill directories
  tip               Tip a skill publisher using the refreshed default payment method

Examples:
  clink skills list --all --format pretty
  clink skills install clinkpay/PollyReach@v1.0.0
  clink skills install clinkpay/PollyReach --force
  clink skills tip --publisher clinkpay --name PollyReach --amount 2
`;
var SKILLS_LIST_HELP = `clink skills list

Usage:
  clink skills list --all [options]

Required Arguments:
  --all                        Request all public skills with pageSize=999

Options:
  --tippable                  Also require valid skillId/merchantId and tipsConfigJson.enabled=true
  --timeout <ms>               Request timeout in milliseconds
${OUTPUT_OPTIONS}

Endpoint:
  GET /prod-api/skill-marketplace/public/skills?pageSize=999&sort=NEW

Behavior:
  Keeps only rows with nonempty publisher, name, and versionNo.
  With --tippable, also requires nonempty skillId/merchantId and boolean tipsConfigJson.enabled=true.
  Filtering happens before the CLI reverses rows and assigns contiguous one-based Number values.
  The resulting JSON array is returned through the standard success envelope.

Examples:
  clink skills list --all --format pretty
  clink skills list --all --tippable --format pretty
`;
var SKILLS_INSTALL_HELP = `clink skills install

Usage:
  clink skills install <publisher>/<skillName>[@<version>] [options]

Arguments:
  <publisher>/<skillName>[@<version>]
                              Skill package identity. When @<version> is omitted, the marketplace
                              returns the latest downloadable version. Publisher and skill names
                              may contain Unicode and internal spaces; quote the full identity.

Options:
  --force                     Replace an existing installation and agent link/copy backups
  --timeout <ms>              Request timeout; package downloads use at least 300000 ms
  --dry-run                   Plan the install without network calls or filesystem writes
${OUTPUT_OPTIONS}

Install Location:
  A single-skill download may be a raw UTF-8 SKILL.md file or a ZIP containing SKILL.md at its root.
  Otherwise, archive-root directories with their own direct SKILL.md files are selected. One uses
  the requested Skill name; two or more form a multi-skill archive and use their directory names as
  sibling entries.
  Ordinary files and other directories are ignored. When no root Skill directory exists and there
  is exactly one top-level directory, the same selection applies inside that common wrapper directory.
  Selected Skills are exposed under ~/.agents/skills.
  Multi-skill releases and Agent updates are committed or rolled back together.

Agent Integration:
  Existing local agent homes are detected automatically and updated where supported:
  Cursor/Claude/Codex/CodeBuddy/Trae, OpenCode/GitHub Copilot/Gemini CLI,
  OpenClaw/Hermes, and CodeWork/ChatGPT.

Endpoint:
  GET /prod-api/skill-marketplace/public/skills/download-url?publisher=...&skillName=...[&versionNo=...]

Examples:
  clink skills install clinkpay/PollyReach@v1.0.0
  clink skills install clinkpay/PollyReach
  clink skills install clinkpay/PollyReach --force
  clink skills install clinkpay/PollyReach --dry-run --format pretty
`;
var SKILLS_TIP_HELP = `clink skills tip

Usage:
  clink skills tip --publisher <publisher> --name <skillName> --amount <amount> [options]

Target:
  --publisher <publisher>      Exact publisher; requires --name
  --name <skillName>           Exact skill name; requires --publisher

Required Argument:
  --amount <amount>            USD amount from 1 to 100 (inclusive)

Options:
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  Publisher and skill names accept Unicode letters, numbers, and internal ASCII spaces.
  Quote publisher or skill-name values that contain spaces.
  Tips select the latest Marketplace version with sort=NEW.
  Successful results include the resolved versionNo when the Marketplace supplies it.
  Tips use the refreshed explicit default payment method.
  A default CARD is charged without a Credit balance check.
  A default BALANCE must have enough finite availableBalance to cover the full amount.
  No explicit default fails with: No default payment method
  An unsupported explicit default fails with: Unsupported default payment method
  Insufficient or invalid default Credit fails with 402: Credit \u4F59\u989D\u4E0D\u8DB3\uFF0C\u8BF7\u5148\u7ED1\u5B9A\u94F6\u884C\u5361
  Payment results expose rawPaymentStatus, rawPaymentMessage, and the original payment payload.
  The backend calculates Credit allocation.
`;
var TOOL_HELP = `clink tool

Usage:
  clink tool item-id --url <url> [options]
  clink tool parse-site --url <url> [options]
  clink tool parse-item --url <url> [options]
  clink tool checkout-total --url <url> [options]
  clink tool get-ucp-profile --url <url> [options]
  clink tool get-rest-endpoint --url <url> [options]
  clink tool internal-ucp get-endpoint --product-url <url> [options]
  clink tool internal-ucp get-merchant-list [options]

Tools:
  item-id        Extract a UCP item_id from a product URL
  parse-site     Detect the site type from a URL
  parse-item     Extract Shopify item facts with merchant, currency, and variant details
  checkout-total Extract the total amount from a Shopify checkout URL
  get-ucp-profile Fetch a merchant UCP discovery profile
  get-rest-endpoint Resolve the UCP REST endpoint and provider
  internal-ucp   Read supported merchants or resolve an internal Clink UCP endpoint

Examples:
  clink tool item-id --url https://uebmaw-it.myshopify.com/products/t-shirt?variant=45085516365894 --format json
  clink tool parse-site --url https://store.example.com --format json
  clink tool parse-item --url https://uebmaw-it.myshopify.com/products/t-shirt --format json
  clink tool checkout-total --url https://store.example.com/checkouts/cn/token/en-cn --format json
  clink tool get-ucp-profile --url https://merchant.example.com --format json
  clink tool get-rest-endpoint --url https://agent.clinkbill.com/login --format json
  clink tool internal-ucp get-endpoint --product-url https://uebmaw-it.myshopify.com/products/demo --format json
  clink tool internal-ucp get-merchant-list --format json
`;
var TOOL_ITEM_ID_HELP = `clink tool item-id

Usage:
  clink tool item-id --url <url> [options]

Arguments:
  --url <url>   Product URL to inspect

Options:
${OUTPUT_OPTIONS}

Behavior:
  Shopify is detected when the hostname ends with .myshopify.com, or when any CNAME in the chain
  has canonical name shops.myshopify.com. For Shopify URLs, item_id is the variant query parameter.
  Other sites return item_id "unknown".

Examples:
  clink tool item-id --url https://uebmaw-it.myshopify.com/products/t-shirt?variant=45085516365894 --format pretty
`;
var TOOL_PARSE_SITE_HELP = `clink tool parse-site

Usage:
  clink tool parse-site --url <url> [options]

Arguments:
  --url <url>   Site URL to inspect

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  Shopify is detected first when the hostname ends with .myshopify.com, then eats365 when it ends
  with .eats365pos.com. Otherwise the CLI sends a browser-like GET request to https://<host> and
  detects Shopify when a powered-by response header contains Shopify. If the header is absent or
  the request fails, the CLI checks whether the hostname's CNAME chain reaches
  shops.myshopify.com. A rate-limited request returns site_detection_rate_limited only when DNS
  cannot confirm Shopify. Other sites return site_type "unknown".

Examples:
  clink tool parse-site --url https://store.example.com --format pretty
  clink tool parse-site --url https://store.eats365pos.com --format pretty
`;
var TOOL_PARSE_ITEM_HELP = `clink tool parse-item

Usage:
  clink tool parse-item --url <url> [options]

Arguments:
  --url <url>   Product detail URL to inspect

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  First detects the site type with the same detector as parse-site. Unknown sites return
  error_code "unkonw site type"; inconclusive rate-limited detection returns
  site_detection_rate_limited. eats365 sites return a normal success envelope with
  resolution "manual_item_facts", an empty items array, and a required_fields list: the platform
  publishes no machine-readable product data, so this is an instruction to source those fields
  from the conversation context and pass them to ucp-checkout create, not a failure to handle.
  That envelope also carries checkout_mapping, which maps each field to its ucp-checkout create
  flag, and unit_price_format. eats365 unitPrice is a major-unit decimal such as "28.00" because
  create scales line_items price by --currency; minor units there would overcharge by that scale.
  Both the unknown and eats365 cases exit 0. For custom Shopify domains, the standard UCP
  profile's validated merchant_origin is used as the canonical storefront origin when available.
  Product URLs are normalized by removing query/hash parameters and appending .js, then the
  command reads the Shopify product JSON and returns one top-level item fact object. The items
  array contains one entry per variant with itemId, title, unitPriceMinor, available, itemUrl,
  options, and inventoryStatus. Shopify unitPriceMinor is in minor units, unlike the eats365
  unitPrice field. itemId is the raw Shopify variant ID. Currency is read from product JSON when
  present, otherwise from Shopify /cart.js. The command does not infer MCC or
  merchantCategoryCode.

Examples:
  clink tool parse-item --url https://uebmaw-it.myshopify.com/products/t-shirt --format pretty
`;
var TOOL_CHECKOUT_TOTAL_HELP = `clink tool checkout-total

Usage:
  clink tool checkout-total --url <url> [options]

Arguments:
  --url <url>   Shopify checkout URL to inspect

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  Reads Shopify checkout serialized GraphQL state from meta[name="serialized-graphql"] and returns
  buyerProposal.runningTotal.value amount/currencyCode. sellerProposal.runningTotal is accepted only
  when it matches the same total. The command does not parse page text or use regex fallbacks.
  When the serialized state is absent, the command exits successfully with error_message
  "checkout_state_not_found".

Examples:
  clink tool checkout-total --url https://store.example.com/checkouts/cn/token/en-cn --format pretty
`;
var TOOL_GET_UCP_PROFILE_HELP = `clink tool get-ucp-profile

Usage:
  clink tool get-ucp-profile --url <url> [options]

Arguments:
  --url <url>   Merchant URL or domain to inspect

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  Reads the merchant origin from --url, then fetches https://<domain>/.well-known/ucp-clink first.
  If absent, it fetches https://<domain>/.well-known/ucp. On success, the command prints the
  discovery JSON directly. When both discovery paths are absent, it exits successfully with
  error_code "NO_UCP_SITE".

Examples:
  clink tool get-ucp-profile --url https://merchant.example.com --format pretty
`;
var TOOL_GET_REST_ENDPOINT_HELP = `clink tool get-rest-endpoint

Usage:
  clink tool get-rest-endpoint --url <url> [options]

Arguments:
  --url <url>   UCP site URL or domain to inspect

Options:
${OUTPUT_OPTIONS}

Behavior:
  Parses the URL hostname and resolves the UCP provider from the primary domain. For clinkbill.com
  and its subdomains, provider is "clinkbill" and endpoint is returned as an empty string. Unknown
  domains return error_code "NO_UCP_REST_ENDPOINT".

Examples:
  clink tool get-rest-endpoint --url https://agent.clinkbill.com/login --format pretty
`;
var TOOL_INTERNAL_UCP_HELP = `clink tool internal-ucp

Usage:
  clink tool internal-ucp get-endpoint --product-url <url> [options]
  clink tool internal-ucp get-merchant-list [options]

Subcommands:
  get-endpoint       Resolve an internal Clink UCP endpoint from a product URL
  get-merchant-list  Return the supported merchant-list document for a public environment

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  get-endpoint uses the effective wallet API base and does not accept environment flags.
  get-merchant-list defaults to production and accepts --sandbox or --test for that invocation.
  Both commands load the selected environment's anonymous GET /agent/ucp/merchants API.
  A product domain outside that list returns error_code "NOT_IN_INTERNAL_UCP_LIST".
  Conflicting merchant IDs for the target hostname are a terminal API configuration error.

Examples:
  clink tool internal-ucp get-endpoint --product-url https://shop.example.com/products/demo --format pretty
  clink tool internal-ucp get-endpoint --product-url https://uebmaw-it.myshopify.com/products/demo --format pretty
  clink tool internal-ucp get-merchant-list --format pretty
`;
var TOOL_INTERNAL_UCP_GET_ENDPOINT_HELP = `clink tool internal-ucp get-endpoint

Usage:
  clink tool internal-ucp get-endpoint --product-url <url> [options]

Arguments:
  --product-url <url>   Product URL whose exact hostname identifies the merchant

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  Resolves an internal merchant by exact product hostname and generates its Clink UCP REST endpoint
  using the environment saved by wallet init. Re-run wallet init to switch environments.
  It loads the selected environment's anonymous GET /agent/ucp/merchants API. Validated successes
  use a short per-process cache and concurrent loads share one in-flight request. A cached hostname
  miss is refreshed before it can become an external-route decision; errors are never cached.
  Each domain is a safe HTTP(S) merchant route URL that may include a path. Only its canonical
  hostname is matched exactly against the product URL hostname; the Clink endpoint is generated
  independently from the effective wallet API base and merchant_id.
  Missing domains return error_code "NOT_IN_INTERNAL_UCP_LIST" with exit code 0.
  Conflicting merchant IDs for the target hostname are a terminal API error and never fall back.
  The read-only GET retries transport, 408, 429, and 5xx once within one total timeout. Other HTTP
  and response-contract failures are API errors (exit 5); exhausted transport/timeouts exit 6.

Examples:
  clink tool internal-ucp get-endpoint --product-url https://shop.example.com/products/demo --format pretty
  clink tool internal-ucp get-endpoint --product-url https://uebmaw-it.myshopify.com/products/demo --format pretty
`;
var TOOL_INTERNAL_UCP_GET_MERCHANT_LIST_HELP = `clink tool internal-ucp get-merchant-list

Usage:
  clink tool internal-ucp get-merchant-list [options]

Options:
${PUBLIC_CATALOG_LIST_OPTIONS}

Behavior:
  Legacy alias for the public merchant-list API. Returns {"merchants":[...]} after validation.
  The command defaults to production; --sandbox selects sandbox/UAT and --test selects test.
  It does not read ~/.clink-cli/config.json or inherit the saved wallet environment, CLINK_BASE_URL,
  CLINK_WALLET_INIT_ENVIRONMENT, OAuth, or CSK credentials.
  It sends anonymous GET /agent/ucp/merchants to the selected API environment with no query or body.
  The backend filters enabled merchants. Each result contains only merchant_id, merchant_name,
  description, and domain; domain is a safe HTTP(S) merchant route URL and may include a path.

Examples:
  clink tool internal-ucp get-merchant-list --format json
`;
var WALLET_HELP = `clink wallet

Usage:
  clink wallet init --email <email> [options]
  clink wallet logout [options]
  clink wallet status [options]

Subcommands:
  init         Authorize this CLI and persist OAuth credentials locally
  logout       Revoke OAuth authorization and remove local credentials
  status       Show effective wallet configuration without network request

Examples:
  clink wallet init --email alice@example.com
  clink wallet init --sandbox --email alice@example.com
  clink wallet init --test --email alice@example.com
  clink wallet logout
  clink wallet status --format pretty
`;
var WALLET_INIT_HELP = `clink wallet init

Usage:
  clink wallet init --email <email> [options]

Arguments:
  --email <email>              Customer email verified in the browser

Options:
  --sandbox                    Use sandbox API base from domains.ts
  --test                       Use test API base from domains.ts; cannot be combined with --sandbox
  --timeout <ms>               Request timeout in milliseconds
  --open                       Open the authorization URL in the browser
  --no-open                    Do not open the browser; overrides --open and default-open-links
  --dry-run                    Print the Device Authorization request without executing it
  --title <text>               Purchase intent title; enables the Quick Instruction context
  --mandates <json>            JSON array of 1-10 mandates; required with Quick Instruction options
  --mandates-file <path>       UTF-8 mandate JSON array file; cannot be combined with --mandates
  --description <text>         Optional Quick Instruction description
  --is-recurring               Mark the Quick Instruction as recurring
  --shipping-address <json>    Optional Quick Instruction shipping-address JSON object
  --effective-until-time <utc> Optional expiry in UTC yyyy-MM-dd HH:mm:ss
${OUTPUT_OPTIONS}

Device Authorization:
  An explicit --sandbox/--test or a distribution-fixed environment takes precedence. Otherwise
  wallet init uses CLINK_BASE_URL when present and production when absent. A successful initialization
  saves the selected base URL for every later command. Re-run wallet init to switch environments.
  The CLI keeps user_code in the browser URL query and carries email/derived name in its fragment.
  The Portal removes those values from the address bar immediately after reading them.
  The CLI prints the URL, opens it only when --open or default-open-links is enabled, then polls
  until authorization completes. --no-open always disables browser launch. If launch fails, open
  the displayed URL manually while polling continues.
  Email OTP entry and confirmation happen in the browser.
  Existing customers keep their server-side name. New customers get the email text before @ as
  their initial name; --name is rejected. Use \`config set name\` to change the local name later.

Quick Instruction:
  Passing any Quick Instruction option sends instruction_context with Device Authorization;
  --title and one of --mandates/--mandates-file are then required. --payment-instrument-id and
  --extra are rejected because no card exists yet and the context is intentionally bounded.
  Title is non-blank and at most 256 characters, description is at most 1024 characters, mandates
  contain 1-10 entries, and the serialized context is at most 16384 UTF-8 bytes. Each mandate
  requires a description of at most 150 characters, a positive amountLimit with at most two
  decimals, and currencyCode.
  Recurring contexts require recurringFrequency WEEKLY, MONTHLY, or YEARLY on every mandate.
  A successful token response reports pendingInstructionId; null means no usable Quick ID was
  returned and does not prove whether creation was skipped or failed.
  A PENDING instruction activates after VIC card binding completes and emits
  purchase_instruction.activated; it does not appear in \`instruction list --valid-only\` first.

Payment Methods:
  After authorization succeeds, wallet init refreshes cached payment methods through the
  card binding-link endpoint and returns the trusted add-card bindingUrl. It uses the local
  add-card path and locally stored email; backend path, query, fragment, and token data are
  discarded. A refresh failure is reported in output but does not fail wallet initialization.

Examples:
  clink wallet init --email alice@example.com
  clink wallet init --sandbox --email alice@example.com
  clink wallet init --test --email alice@example.com
  clink wallet init --test --email alice@example.com --title "Buy running shoes" \\
    --mandates '[{"description":"Running shoes","amountLimit":"25.50","currencyCode":"USD"}]'
`;
var WALLET_LOGOUT_HELP = `clink wallet logout

Usage:
  clink wallet logout [options]

Behavior:
  Best-effort revokes the current OAuth Refresh Token, then removes both OAuth credentials
  and any legacy customer API key from local config. It also removes customerId, payment-method
  cache, and risk-rule cache so a later login may safely bind a different customer.

Options:
  --timeout <ms>               Request timeout in milliseconds
  --dry-run                    Print the revoke request without changing local config
${OUTPUT_OPTIONS}

Examples:
  clink wallet logout
  clink wallet logout --format pretty
`;
var WALLET_STATUS_HELP = `clink wallet status

Usage:
  clink wallet status [options]

Notes:
  Shows the effective local wallet configuration after resolving flags, environment variables,
  and saved config. Stored OAuth authorization takes priority over legacy CSK. OAuth wallets never
  fall back to CSK, including after logout or expiry. No network request is made, and raw OAuth
  tokens and customer API keys are never printed. authorizationEnvironmentMatches reports whether
  saved OAuth can be used with the selected API base; oauthRequired remains true after logout.

Options:
${CUSTOMER_AUTH_OPTIONS}
${OUTPUT_OPTIONS}

Examples:
  clink wallet status
  clink wallet status --format pretty
`;
var CARD_HELP = `clink card

Usage:
  clink card binding-link [options]
  clink card setup-link [--open] [options]
  clink card modify-link [--open] [options]
  clink card passkey-link --payment-instrument-id <id> [--open] [options]
  clink card list [options]
  clink card get --payment-instrument-id <id> [options]

Subcommands:
  binding-link   Fetch raw binding link and refresh cached payment methods
  setup-link     Fetch payment method setup link and refresh cached payment methods
  modify-link    Fetch payment method modify link and refresh cached payment methods
  passkey-link   Open Visa card Passkey registration through Browser Handoff
  list           List cached payment methods from local config
  get            Get cached payment method detail from local config
`;
var CARD_BINDING_LINK_HELP = `clink card binding-link

Usage:
  clink card binding-link [options]

Options:
  --no-watch                   Skip Event Hub readiness/watch and return an explicit watch gap
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  Calls /agent/cwallet/card/bindingLink.
  Refreshes local cached payment methods from paymentMethodsVoList.
  Rebuilds the returned link from its Portal origin and appends the locally stored email.
  Other backend path, query, and fragment values are not exposed.
  With watch enabled, waits for the first well-formed successful Event Hub poll, then prints an
  add-card bindingUrl rebuilt from the trusted Portal origin with watchReady=true and
  watchEventType=payment_method.added.
  watchReady means the listener is ready; completion is the matching event in the second envelope.
  Event Hub filters payment_method.added before pagination. Only matching events are ACKed;
  unrelated current and stale events remain queued. A malformed successful poll fails before the
  binding handoff is exposed.
  Pass --no-watch when you only need to refresh the cached card list; it does not poll and returns
  watchReady=false plus watchEventType=null while stderr identifies the missing listener.

Examples:
  clink card binding-link
  clink card binding-link --no-watch --format pretty
`;
var CARD_SETUP_LINK_HELP = `clink card setup-link

Usage:
  clink card setup-link [--open] [options]

Options:
  --open                       Open the generated setup link in the browser
  --no-watch                   Skip polling for webhook events after printing the link
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  Derives the add-card page from the binding link response.
  Refreshes local cached payment methods before returning the setup URL.
  Appends the locally stored email so a signed-out browser can prefill login.
  With --open and Agent OAuth, first attempts a one-time loopback browser handoff. Listener/create
  failures open the trusted setup URL directly; callback/approve failures use email-code login.
  After printing the link, polls for webhook events until one arrives (max 15 min); use --no-watch to skip.

Examples:
  clink card setup-link
  clink card setup-link --open
`;
var CARD_MODIFY_LINK_HELP = `clink card modify-link

Usage:
  clink card modify-link [--open] [options]

Options:
  --open                       Open the generated manage-card link in the browser
  --no-watch                   Skip polling for webhook events after printing the link
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  Derives the manage-card page from the binding link response.
  Refreshes local cached payment methods before returning the modify URL.
  Appends the locally stored email so a signed-out browser can prefill login.
  With --open and Agent OAuth, first attempts a one-time loopback browser handoff. Listener/create
  failures open the trusted modify URL directly; callback/approve failures use email-code login.
  After printing the link, polls for webhook events until one arrives (max 15 min); use --no-watch to skip.

Examples:
  clink card modify-link
  clink card modify-link --open
`;
var CARD_PASSKEY_LINK_HELP = `clink card passkey-link

Usage:
  clink card passkey-link --payment-instrument-id <id> [--open] [options]

Required Arguments:
  --payment-instrument-id <id> Payment instrument ID for the Visa card

Options:
  --customer-api-key <key>     Legacy API key override for never-OAuth wallets only
  --timeout <ms>               Browser Handoff request timeout in milliseconds
  --open                       Open the Visa Passkey page in the browser
  --dry-run                    Print the link without opening the browser
${OUTPUT_OPTIONS}

Notes:
  Builds the Visa card Passkey URL locally without creating an Instruction.
  With --open and Agent OAuth, first completes a one-time loopback Browser Handoff so the Portal
  receives a browser session before navigating to the Passkey page.
  After Passkey registration, refresh the card through clink card binding-link --no-watch.
  Output includes manualOpenUrl and browserLaunch for caller diagnostics.

Examples:
  clink card passkey-link --payment-instrument-id pi_xxx --open
`;
var CARD_LIST_HELP = `clink card list

Usage:
  clink card list [options]

Notes:
  Reads payment methods from local config only and does not make a network request.

Options:
${OUTPUT_OPTIONS}

Examples:
  clink card list
  clink card list --format pretty
`;
var CARD_GET_HELP = `clink card get

Usage:
  clink card get --payment-instrument-id <id> [options]

Arguments:
  --payment-instrument-id <id> Payment instrument ID to read from local cached payment methods

Options:
${OUTPUT_OPTIONS}

Notes:
  Reads payment method detail from local config only and does not make a network request.

Examples:
  clink card get --payment-instrument-id pi_xxx
  clink card get --payment-instrument-id pi_xxx --format pretty
`;
var RISK_RULE_HELP = `clink risk

Usage:
  clink risk get [options]
  clink risk link [--open] [options]

Subcommands:
  get          Fetch current risk rule settings
  link         Print the agent risk-rule setup page URL
`;
var RISK_RULE_GET_HELP = `clink risk get

Usage:
  clink risk get [options]

Options:
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  Calls GET /agent/risk/rule/settings.

Examples:
  clink risk get
  clink risk get --format pretty
`;
var RISK_RULE_LINK_HELP = `clink risk link

Usage:
  clink risk link [--open] [options]

Options:
${CUSTOMER_API_KEY_LINK_OPTIONS}

Notes:
  Prints the agent risk-rule setup page at /risk-rules-setup. The agent domain mirrors the
  environment saved by wallet init, or the environment derived from an explicit base override.
  No network request.
  After printing the link, polls for webhook events until one arrives (max 15 min); use --no-watch to skip.

Examples:
  clink risk link
  clink risk link --open
`;
var PAY_HELP = `clink pay

Usage:
  clink pay --merchant-id <id> --amount <amount> --currency <currency> [--payment-instrument-id <id>] [options]
  clink pay --session-id <id> [--payment-instrument-id <id>] [options]

Arguments:
  --merchant-id <id>           Merchant ID for direct charge mode
  --amount <amount>            Charge amount for direct charge mode
  --currency <currency>        Charge currency for direct charge mode, for example USD
  --session-id <id>            Checkout session ID for session mode
  --payment-instrument-id <id> Payment instrument to charge; optional for ALIPAY
  --instruction-id <id>          VIC purchase instruction ID sent as instruction_id
  --purchase-instruction-id <id> Backward-compatible alias for --instruction-id
  --mandate-id <id>              VIC mandate ID sent as mandate_id
  --shipping-address <json>      UCP Postal Address JSON object sent as shippingaddress
  --products <json>              Product list JSON array for aiAgentInstructionBo.products

Options:
  --payment-method-type <type> Payment method type, defaults to CARD
  --terminal-qr               Render a returned payment QR in the terminal
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  If --payment-instrument-id is omitted, ALIPAY sends no payment instrument and lets the backend
  resolve or create it. CARD and BALANCE keep using the cached default payment method. Other types
  refresh payment methods and require one matching type. If none match, bind one and refresh
  payment methods. When several match, exactly one must be marked default or the caller must pass
  --payment-instrument-id explicitly.
  An explicit payment instrument for ALIPAY or those other types is validated against the refreshed
  list and must have the requested type. Explicit CARD and BALANCE behavior is unchanged.
  Refresh cached payment methods with clink card binding-link when needed.
  For VIC-routed charge, pass instruction_id and mandate_id via --instruction-id and --mandate-id.
  For shipped physical goods, pass --shipping-address as UCP Postal Address JSON:
  street_address, extended_address, address_locality, address_region, address_country,
  postal_code, first_name, last_name, and phone_number.
  For product-level VIC credential context, pass --products as a JSON array with productId,
  productName, productUrl, quantity, unitPrice, currencyCode, and optional extra.
  Old agent pay always sends aiAgentInstructionBo.merchantInfo.merchantCategoryCode = 5999.
  A status 5 payment with a PNG QR response returns customerAction.type=QR_CODE_REQUIRED,
  mediaType=image/png, a private temporary imagePath, cleanupRequired=true, a directory-level
  cleanupPath, order/payment execution IDs, and expiry metadata. expiresAt is Unix epoch seconds;
  event consumers use expiresSecond with a maximum of 900 seconds. The PNG Data URL is never
  printed. After payment reaches a terminal state or expires, the caller must remove
  customerAction.cleanupPath recursively.
  With --terminal-qr, pay also renders the QR as UTF-8 characters on stderr while stdout remains
  one machine-readable result. The raw QR payload is never printed. If terminal rendering is
  unavailable, pay prints a safe warning and keeps customerAction.imagePath for fallback display.
  If the payment was submitted but the QR cannot be validated or stored, pay returns
  error.type=payment_state_unknown with retryAllowed=false and the existing order/payment
  execution IDs. Do not retry automatically; verify the existing payment first.

Examples:
  clink pay --merchant-id merchant_xxx --amount 10 --currency USD --payment-instrument-id pi_xxx
  clink pay --merchant-id merchant_xxx --amount 1 --currency USD --payment-method-type ALIPAY --terminal-qr --format json
  clink pay --session-id sess_xxx --payment-instrument-id pi_xxx
  clink pay --session-id sess_xxx --instruction-id ins_xxx --mandate-id mndt_xxx --shipping-address '{"street_address":"1 Market St","address_locality":"San Francisco","address_region":"CA","address_country":"US","postal_code":"94105","first_name":"Ada","last_name":"Lovelace","phone_number":"+14155550100"}' --products '[{"productId":"sku_1","productName":"Demo","quantity":1,"unitPrice":12.99,"currencyCode":"USD"}]'
`;
var REFUND_HELP = `clink refund

Usage:
  clink refund create --order-id <id> [options]
  clink refund get --refund-id <id> [options]

Subcommands:
  create       Apply full refund for an order
  get          Query refund status
`;
var REFUND_CREATE_HELP = `clink refund create

Usage:
  clink refund create --order-id <id> [options]

Arguments:
  --order-id <id>              Order ID to refund

Options:
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  Applies a full refund for the given order.

Examples:
  clink refund create --order-id order_xxx
  clink refund create --order-id order_xxx --format pretty
`;
var REFUND_GET_HELP = `clink refund get

Usage:
  clink refund get --refund-id <id> [options]

Arguments:
  --refund-id <id>             Refund order ID to query

Options:
${CUSTOMER_REQUEST_OPTIONS}

Examples:
  clink refund get --refund-id rfd_xxx
  clink refund get --refund-id rfd_xxx --format pretty
`;
var UCP_CHECKOUT_HELP = `clink ucp-checkout

Usage:
  clink ucp-checkout <run|create|get|update|cancel|complete> [options]

Actions:
  run       Create, complete exactly once, and optionally wait for digital delivery
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
  --currency <currency>           Checkout currency for create; update validation/dry-run hint
  --line-items <json>             UCP line_items JSON array for create/update
  --buyer <json>                  UCP buyer JSON object for create/update
  --shipping-address <json>       Shipping address JSON object for create/update
  --metadata <json>               Metadata JSON object for create/update
  --payment-instrument-id <id>    Payment instrument ID for run/complete; defaults to the cached default card
  --confirm-purchase              Required for a live run; confirms the user-approved purchase
  --wait-delivery                 After a completed run, wait for the returned digital order
  --max-wait <seconds>            Delivery wait bound for run; defaults to 900
  --endpoint <url>                Optional checkout endpoint prefix; appends checkout-sessions paths

Notes:
  Calls /agent/ucp/external/checkout-sessions internally because CLI-discovered merchants use the
  shadow-merchant external checkout path by default. The command surface intentionally does not
  expose an "external" mode or subcommand.
  When --endpoint is provided, create appends /checkout-sessions, get/update append
  /checkout-sessions/{checkoutId}, and cancel/complete append the corresponding action path.
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  create sends merchant_url, customer_id, buyer.email, and context.currency.
  customer_id and buyer.email come from the local clink config JSON.
  Idempotency-Key is generated by clink for create/update/complete; callers do not pass it.
  create treats line_items price/amount fields as decimal major-unit values and converts them to
  minor units by --currency. Live update reads the existing checkout currency and converts decimal
  strings such as "12.00"; integer JSON numbers remain accepted as minor units for compatibility.
  update --dry-run requires --currency because it performs no read request.
  complete sends a standard UCP payment object with payment.instruments[0].id as local
  config customerId#paymentInstrumentId and credential.token as the payment instrument ID; when
  omitted, it uses the local cached default card.
  run requires --confirm-purchase before any live request. It never retries create or complete,
  calls complete exactly once, and returns a read-only get resumeCommand for non-completed states.
  --wait-delivery starts only when complete returns status=completed and data.order.id. It reuses
  the bounded, read-only ucp-order delivery wait and never retries payment or Checkout.
  run --dry-run needs no confirmation and prints the create, exactly-once complete, and optional
  delivery plan without making network requests or payment side effects.
  A completed get/complete response carries the OMS/UCP order ID in data.order.id. Pass that exact
  value to ucp-order get; do not infer the ID kind from an order_ prefix. agent_order event
  resourceId, data.orderId, and data.paymentOrderId are Clink Payment order IDs, not UCP order IDs.

Examples:
  clink ucp-checkout run \\
    --merchant-url https://shop.example/checkout/abc \\
    --merchant-category-code 5311 --currency USD \\
    --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"10.00"},"quantity":1}]' \\
    --payment-instrument-id pi_xxx --confirm-purchase --wait-delivery --format json
  clink ucp-checkout create \\
    --merchant-url https://shop.example/checkout/abc \\
    --merchant-category-code 5311 --currency USD \\
    --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"10.00"},"quantity":1}]' \\
    --format json
  clink ucp-checkout get --checkout-id chk_xxx --format json
  clink ucp-checkout update --checkout-id chk_xxx --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"12.00"},"quantity":1}]' --format json
  clink ucp-checkout complete --checkout-id chk_xxx --format json
  clink ucp-checkout cancel --checkout-id chk_xxx --format json
`;
var UCP_CATALOG_HELP = `clink ucp-catalog

Usage:
  clink ucp-catalog search --merchant-id <id> --query <text> [options]

Actions:
  search     Search one merchant's UCP Catalog
  product    Get one product by the ID returned from Catalog search

Examples:
  clink ucp-catalog search --merchant-id merchant_xxx --query keyboard --format json
  clink ucp-catalog product --merchant-id merchant_xxx --product-id product_xxx --format json
  clink ucp-catalog search --merchant-id merchant_xxx --query watch --context '{"currency":"USD","language":"en-US"}' --limit 10 --format pretty
`;
var UCP_CATALOG_SEARCH_HELP = `clink ucp-catalog search

Usage:
  clink ucp-catalog search --merchant-id <id> --query <text> [options]

Required Arguments:
  --merchant-id <id>          Merchant-scoped UCP Catalog owner
  --query <text>              Catalog search text

Optional Request Fields:
  --language <tag>            UCP context.language shortcut; an IETF BCP 47 tag such as en,
                              zh-Hans, or fr-CA. Omitted means results are not translated
  --context <json>            UCP Catalog context JSON object. Fields:
                              - address_country: ISO 3166-1 alpha-2 context hint (e.g., "SG", "HK")
                              - language: IETF BCP 47 language tag (e.g., "en", "zh-Hans")
                              - currency: ISO 4217 code (e.g., "USD", "HKD")
  --language <tag>            Convenience override for context.language
  --filters <json>            UCP Catalog filters JSON object; prices use minor units
  --signals <json>            UCP Catalog signals JSON object
  --attribution <json>        UCP Catalog attribution JSON object
  --cursor <cursor>           Pagination cursor from a previous response
  --limit <n>                 Page size from 1 to 100; server default is 10
  --request-id <id>           Request-Id header; defaults to a generated UUID
  --ucp-agent <value>         UCP-Agent header; defaults to clink-cli

Options:
${PUBLIC_CATALOG_REQUEST_OPTIONS}

Behavior:
  Sends an anonymous request to POST /agent/ucp/{merchantId}/catalog/search. It defaults to
  production; --sandbox selects sandbox/UAT and --test selects test for this invocation.
  It does not read ~/.clink-cli/config.json or inherit saved/environment OAuth, CSK, customer ID,
  CLINK_BASE_URL, or wallet environment values. A 401/403 is returned as an API error without token
  refresh or a wallet-login recovery prompt.
  Localization is opt-in and comes only from context.language: pass --language <tag> or set the
  field inside --context, never both. Omit them and results keep the merchant's original titles
  and descriptions; the query text is never used to guess a target language.

Examples:
  clink ucp-catalog search --merchant-id merchant_xxx --query keyboard --format json
  clink ucp-catalog search --merchant-id merchant_xxx --query \u718A\u732B\u5916\u5356 --language en --format json
  clink ucp-catalog search     --merchant-id merchant_xxx --query watch     --language en-US --context '{"currency":"USD"}'     --filters '{"price":{"min":1000,"max":50000},"offer_types":["one_time"]}'     --limit 10 --format pretty
`;
var UCP_CATALOG_PRODUCT_HELP = `clink ucp-catalog product

Usage:
  clink ucp-catalog product --merchant-id <id> --product-id <id> [options]

Required Arguments:
  --merchant-id <id>          Merchant-scoped UCP Catalog owner
  --product-id <id>           Product ID returned by ucp-catalog search

Optional Request Fields:
  --language <tag>            UCP context.language shortcut; an IETF BCP 47 tag such as en,
                              zh-Hans, or fr-CA. Omitted means results are not translated
  --context <json>            UCP Catalog context JSON object
  --language <tag>            Convenience override for context.language
  --filters <json>            UCP Catalog filters JSON object; prices use minor units
  --signals <json>            UCP Catalog signals JSON object
  --attribution <json>        UCP Catalog attribution JSON object
  --request-id <id>           Request-Id header; defaults to a generated UUID
  --ucp-agent <value>         UCP-Agent header; defaults to clink-cli

Options:
${PUBLIC_CATALOG_REQUEST_OPTIONS}

Behavior:
  Sends an anonymous request to POST /agent/ucp/{merchantId}/catalog/product. It defaults to
  production; --sandbox selects sandbox/UAT and --test selects test for this invocation.
  It does not read ~/.clink-cli/config.json or inherit saved/environment credentials or API bases.
  Localization is opt-in and comes only from context.language: pass --language <tag> or set the
  field inside --context, never both. Omit them and the product keeps its original title and
  description. Pass the same language Search used, or the two views disagree.

Examples:
  clink ucp-catalog product     --merchant-id merchant_xxx     --product-id product_xxx     --language en-US --context '{"currency":"USD"}'     --format json
  clink ucp-catalog product     --merchant-id merchant_xxx     --product-id product_xxx     --language en     --format json
`;
var UCP_MERCHANT_HELP = `clink ucp-merchant

Usage:
  clink ucp-merchant list --internal [options]

Actions:
  list       List enabled UCP merchants from Clink's public merchant API

The --internal selector is required. It selects Clink's UCP merchant source; it does not require
internal-network access or authentication.

Examples:
  clink ucp-merchant list --internal --format json
  clink ucp-merchant list --internal --sandbox --format pretty
`;
var UCP_MERCHANT_LIST_HELP = `clink ucp-merchant list

Usage:
  clink ucp-merchant list --internal [options]

Required Selector:
  --internal                   Select the Clink UCP merchant source

Options:
${PUBLIC_CATALOG_LIST_OPTIONS}

Behavior:
  Sends an anonymous GET /agent/ucp/merchants with no query or body. It defaults to production;
  --sandbox selects sandbox/UAT and --test selects test for this invocation.
  It does not read ~/.clink-cli/config.json or inherit saved wallet state, CLINK_BASE_URL,
  CLINK_WALLET_INIT_ENVIRONMENT, OAuth, CSK, customer ID, or customer API key credentials.
  The backend filters enabled merchants. Each validated result contains only merchant_id,
  merchant_name, description, and domain. domain must be a safe HTTP(S) merchant route URL and may
  include a path. Valid rows survive unrelated invalid rows; a non-empty wholly invalid array fails.
  Validated successes use a short per-process cache and concurrent loads share one request. The
  read-only GET retries transport, 408, 429, and 5xx once within the total timeout. Other HTTP
  failures, including 401/403, are API errors (exit 5); exhausted transport/timeouts exit 6.

Examples:
  clink ucp-merchant list --internal --format json
  clink ucp-merchant list --internal --test --format pretty
`;
var CATALOG_HELP = `clink catalog

Usage:
  clink catalog search --query <text> [options]

Actions:
  search     Search catalogs across merchants without naming one

Examples:
  clink catalog search --query "iced latte" --format json
  clink catalog search --query shoes --channel-type shopify --format pretty
`;
var CATALOG_SEARCH_HELP = `clink catalog search

Usage:
  clink catalog search --query <text> [options]

Required Arguments:
  --query <text>              Catalog search text

Optional Request Fields:
  --channel-type <type>       Narrow to one channel, for example shopify or eats365.
                              Omitted means discovery across every channel
  --form-type <type>          Caller-declared form or scenario type; echoed back in discovery mode
  --ext <json>                Caller-defined extension map, passed through and logged only.
                              It never affects search conditions or the response shape
  --language <tag>            UCP context.language shortcut; an IETF BCP 47 tag such as en,
                              zh-Hans, or fr-CA
  --context <json>            UCP Catalog context JSON object. Fields:
                              - address_country: ISO 3166-1 alpha-2 region hint (e.g., "SG", "HK")
                              - language: IETF BCP 47 language tag (e.g., "en", "zh-Hans")
                              - currency: ISO 4217 code (e.g., "USD", "HKD")
  --language <tag>            Convenience override for context.language
  --filters <json>            UCP Catalog filters JSON object; prices use minor units
  --signals <json>            UCP Catalog signals JSON object
  --attribution <json>        UCP Catalog attribution JSON object
  --request-id <id>           Request-Id header; defaults to a generated UUID
  --ucp-agent <value>         UCP-Agent header; defaults to clink-cli

Options:
${PUBLIC_CATALOG_REQUEST_OPTIONS}

Endpoint:
  POST /agent/ucp/extra/catalog/search

Behavior:
  Sends an anonymous request, defaults to production, and accepts --sandbox or --test for this
  invocation. It does not read ~/.clink-cli/config.json or inherit wallet credentials/environment.
  Takes no --merchant-id: this endpoint finds which merchants carry the item, so the caller does
  not need to know one up front. Use ucp-catalog search when the merchant is already known.
  address_country is a discovery hint, not a strict filter. Published external-store mappings
  currently cover HK and SG; other ISO codes may leave results un-narrowed.
  Broad discovery returns a bounded, non-exhaustive result window and currently exposes no pagination.
  Use ucp-catalog search for real cursor pagination when a merchant is already known.
  Results come back grouped by target, each group carrying channel_type plus either merchant_id
  (internal merchant) or store_id (external platform store). The shape does not change with
  --channel-type; only the number of groups does.
  Set context.language, with --language <tag> or the field inside --context, to declare the
  caller's language; the two cannot be combined and the query text is never used to guess one.
  Broad discovery forwards that language to each provider but does not run UCP's LLM translation
  pass; provider localization may vary. The result translation is implemented for merchant-scoped
  ucp-catalog search and product only.

Examples:
  clink catalog search --query "iced latte" --format json
  clink catalog search \\
    --query shoes --channel-type shopify \\
    --ext '{"trace":"demo-1"}' \\
    --language en-US --context '{"currency":"USD"}' \\
    --format pretty
  clink catalog search \\
    --query coffee \\
    --language en --context '{"address_country":"SG","currency":"SGD"}' \\
    --format json
`;
var UCP_ORDER_HELP = `clink ucp-order

Usage:
  clink ucp-order <get|wait-delivery|list> [options]

Actions:
  get             Get one UCP order's current status by order ID
  wait-delivery   Poll an expected digital delivery until ready, failed, or timed out
  list            List the calling wallet's orders, newest first

Examples:
  clink ucp-order get --order-id order_xxx --format json
  clink ucp-order wait-delivery --order-id order_xxx --max-wait 900 --format json
  clink ucp-order list --status paid --format json
  clink ucp-order list --status paid,refunded --start-time 2026-07-01T00:00:00Z --format pretty
`;
var UCP_ORDER_GET_HELP = `clink ucp-order get

Usage:
  clink ucp-order get --order-id <id> [options]

Required Arguments:
  --order-id <id>             Order ID to fetch

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  GET /agent/ucp/orders/{orderId}

Behavior:
  Uses the environment saved by wallet init. The endpoint is not merchant-scoped: ownership is
  checked against the caller's wallet identity, so another buyer's order returns not_found.
  OAuth wallets use Bearer authentication with automatic 401 refresh; never-OAuth wallets use
  their legacy customer API key.
  --order-id must be data.order.id from a completed ucp-checkout get/complete response. Do not infer
  the ID kind from an order_ prefix: agent_order event resourceId, data.orderId, and
  data.paymentOrderId are Clink Payment order IDs and must not be used here. A successful response
  can include the merchant completion details in data.ucp.success_info.

Examples:
  clink ucp-order get --order-id order_xxx --format json
`;
var UCP_ORDER_WAIT_DELIVERY_HELP = `clink ucp-order wait-delivery

Usage:
  clink ucp-order wait-delivery --order-id <id> [--max-wait <seconds>] [options]

Required Arguments:
  --order-id <id>             UCP Order ID whose digital delivery is expected

Optional Arguments:
  --max-wait <seconds>        Bounded wait across order reads (default 900)

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  Repeated GET /agent/ucp/orders/{orderId}

Behavior:
  Use only when the frozen product context expects a digital delivery such as a voucher, coupon,
  card secret, redemption link, or image. A missing digital_delivery field is treated as pending
  because the asynchronous payment projection may not have initialized it yet. Pending reads honor
  digital_delivery.next_retry_at with a 3-to-30-second local clamp. The command stops at ready or
  failed; ready requires at least one artifact. It never retries payment, checkout completion, or
  order creation.

  Output contains ready, timedOut, deliveryStatus, attempts, and the last authoritative order.
  A timeout also contains resumeCommand. Payment success and delivery status remain independent:
  failed or timed-out delivery must not downgrade an already confirmed payment.

Examples:
  clink ucp-order wait-delivery --order-id order_xxx --max-wait 900 --format json
`;
var UCP_ORDER_LIST_HELP = `clink ucp-order list

Usage:
  clink ucp-order list [--status <statuses>] [--start-time <utc>] [--end-time <utc>] [options]

Optional Arguments:
  --status <statuses>         Comma-separated order statuses; matches any of them. One of
                              draft, pending, paid, cancelled, partially_refunded, refunded
  --start-time <utc>          Created-at lower bound, inclusive; UTC RFC 3339
  --end-time <utc>            Created-at upper bound, inclusive; UTC RFC 3339
  --page <n>                  Page number starting at 1; server default is 1
  --size <n>                  Page size; the server applies its own default and upper bound

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  GET /agent/ucp/orders?created_from=&created_to=&status=&page=&size=
  Multiple statuses are sent as repeated status params, for example status=paid&status=refunded.

Behavior:
  Returns only the calling wallet's own orders, newest first: ownership comes from the wallet
  identity and cannot be passed in. Timestamps without a zone offset are read as UTC and sent as
  RFC 3339. Rows carry id, checkout_id, status, payment_status, amount, currency, and created_at;
  use ucp-order get for the full order.

Examples:
  clink ucp-order list --status paid --format json
  clink ucp-order list \\
    --status paid,partially_refunded,refunded \\
    --start-time 2026-07-01T00:00:00Z \\
    --end-time 2026-07-31T23:59:59Z \\
    --size 20 --format pretty
`;
var UCP_CHECKOUT_CREATE_HELP = `clink ucp-checkout create

Usage:
  clink ucp-checkout create --merchant-url <url> --merchant-category-code <code> --currency <currency> --line-items <json> [options]

Required Arguments:
  --merchant-url <url>            External merchant checkout URL
  --merchant-category-code <code> Merchant category code, ISO 18245 MCC
  --currency <currency>           Checkout currency, for example USD
  --line-items <json>             UCP line_items JSON array

Optional Arguments:
  --merchant-name <name>          Merchant display name override
  --order-channel-id <id>         Advanced override; backend normally derives it from merchant-url
  --buyer <json>                  UCP buyer JSON object
  --shipping-address <json>       Shipping address JSON object
  --metadata <json>               Metadata JSON object
  --endpoint <url>                Optional checkout endpoint prefix; appends /checkout-sessions

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  POST /agent/ucp/external/checkout-sessions

Notes:
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  customer_id and buyer.email are read from the local clink config JSON.
  Idempotency-Key is generated by clink.
  line_items price/amount fields are decimal major-unit values and are converted by --currency;
  --currency is sent as context.currency.

Examples:
  clink ucp-checkout create \\
    --merchant-url https://shop.example/checkout/abc \\
    --merchant-category-code 5311 --currency USD \\
    --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"10.00"},"quantity":1}]' \\
    --format json
`;
var UCP_CHECKOUT_RUN_HELP = `clink ucp-checkout run

Usage:
  clink ucp-checkout run --merchant-url <url> --merchant-category-code <code> --currency <currency> --line-items <json> [options]

Required Arguments:
  --merchant-url <url>            External merchant checkout URL
  --merchant-category-code <code> Merchant category code, ISO 18245 MCC
  --currency <currency>           Checkout currency, for example USD
  --line-items <json>             UCP line_items JSON array
  --confirm-purchase              Required for live execution; omit only with --dry-run

Optional Arguments:
  --merchant-name <name>          Merchant display name override
  --order-channel-id <id>         Advanced override; backend normally derives it from merchant-url
  --buyer <json>                  UCP buyer JSON object
  --shipping-address <json>       Shipping address JSON object
  --metadata <json>               Metadata JSON object
  --payment-instrument-id <id>    Payment instrument ID to charge; defaults to the cached default card
  --wait-delivery                 Wait for digital delivery after authoritative completion
  --max-wait <seconds>            Delivery wait bound; defaults to 900 and requires --wait-delivery
  --endpoint <url>                Optional checkout endpoint prefix; appends /checkout-sessions

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoints:
  POST /agent/ucp/external/checkout-sessions
  POST /agent/ucp/external/checkout-sessions/{checkoutId}/complete
  GET  /agent/ucp/orders/{orderId} only with --wait-delivery after completed + data.order.id

Safety:
  Missing --confirm-purchase on a live run is rejected before any network request.
  create and complete are each called once and are never automatically retried. complete is the
  only payment-submitting step. A complete_in_progress or any other non-completed response returns
  stage=complete plus a read-only resumeCommand bound to the original endpoint and checkoutId.
  --wait-delivery starts only for status=completed with data.order.id. ready, failed, and timeout
  return the authoritative order and digital_delivery snapshot; timeout reuses the ucp-order
  wait-delivery resumeCommand. Delivery polling never retries create, complete, or payment.
  --dry-run performs no network request and prints an auditable create/complete/delivery plan.

Examples:
  clink ucp-checkout run \\
    --merchant-url https://shop.example/checkout/abc \\
    --merchant-category-code 5311 --currency USD \\
    --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"10.00"},"quantity":1}]' \\
    --payment-instrument-id pi_xxx --confirm-purchase --format json
  clink ucp-checkout run \\
    --merchant-url https://shop.example/checkout/abc \\
    --merchant-category-code 5311 --currency USD \\
    --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Voucher","price":"10.00"},"quantity":1}]' \\
    --confirm-purchase --wait-delivery --max-wait 900 --format json
`;
var UCP_CHECKOUT_GET_HELP = `clink ucp-checkout get

Usage:
  clink ucp-checkout get --checkout-id <id> [options]

Required Arguments:
  --checkout-id <id>              Checkout ID to fetch

Optional Arguments:
  --endpoint <url>                Optional checkout endpoint prefix
  --max-wait <seconds>            Poll only this Checkout until terminal; defaults to 900
  --wait-delivery                 After completed + data.order.id, also wait for digital delivery

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  GET /agent/ucp/external/checkout-sessions/{checkoutId}

Notes:
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  Without wait flags, performs one GET. With --max-wait, polls only the same Checkout by GET and
  never creates, completes, or submits payment. --wait-delivery continues from an authoritative
  completed Checkout into the same order's digital-delivery wait. A timeout returns one bound
  ucp-checkout get resumeCommand; callers must not append ucp-order commands.
  Once completed, data.order.id is the OMS/UCP order ID accepted by ucp-order get. Do not use an
  agent_order event's resourceId, data.orderId, or data.paymentOrderId; those are Clink Payment
  order IDs, and an order_ prefix does not distinguish the two ID domains.

Examples:
  clink ucp-checkout get --checkout-id chk_xxx --format json
  clink ucp-checkout get --checkout-id chk_xxx --wait-delivery --max-wait 900 --format json
`;
var UCP_CHECKOUT_UPDATE_HELP = `clink ucp-checkout update

Usage:
  clink ucp-checkout update --checkout-id <id> --line-items <json> [options]

Required Arguments:
  --checkout-id <id>              Checkout ID to update
  --line-items <json>             Replacement UCP line_items JSON array

Optional Arguments:
  --currency <currency>           Expected checkout currency; required only with --dry-run
  --buyer <json>                  Replacement UCP buyer JSON object
  --shipping-address <json>       Replacement shipping address JSON object
  --metadata <json>               Replacement metadata JSON object
  --endpoint <url>                Optional checkout endpoint prefix

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  PUT /agent/ucp/external/checkout-sessions/{checkoutId}

Notes:
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  Idempotency-Key is generated by clink.
  Live update fetches the existing checkout first and converts line_items price/amount decimal
  strings such as "12.00" to minor-unit integers using its currency. Existing integer JSON numbers
  remain minor-unit values for backward compatibility. --currency, when supplied, must match the
  fetched checkout and is not sent in the PUT body. --dry-run performs no fetch, so it requires
  --currency as the conversion hint.

Examples:
  clink ucp-checkout update \\
    --checkout-id chk_xxx \\
    --line-items '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"12.00"},"quantity":1}]' \\
    --format json
`;
var UCP_CHECKOUT_CANCEL_HELP = `clink ucp-checkout cancel

Usage:
  clink ucp-checkout cancel --checkout-id <id> [options]

Required Arguments:
  --checkout-id <id>              Checkout ID to cancel

Optional Arguments:
  --endpoint <url>                Optional checkout endpoint prefix

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  POST /agent/ucp/external/checkout-sessions/{checkoutId}/cancel

Notes:
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.

Examples:
  clink ucp-checkout cancel --checkout-id chk_xxx --format json
`;
var UCP_CHECKOUT_COMPLETE_HELP = `clink ucp-checkout complete

Usage:
  clink ucp-checkout complete --checkout-id <id> [--payment-instrument-id <id>] [options]

Required Arguments:
  --checkout-id <id>              Checkout ID to complete

Optional Arguments:
  --payment-instrument-id <id>    Payment instrument ID to charge; defaults to the cached default card
  --endpoint <url>                Optional checkout endpoint prefix

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  POST /agent/ucp/external/checkout-sessions/{checkoutId}/complete

Notes:
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  Idempotency-Key is generated by clink.
  Sends a standard UCP payment object in the request body. The selected instrument id is local
  config customerId#paymentInstrumentId, and credential.token is the payment instrument ID. When
  --payment-instrument-id is omitted or empty, the CLI uses the local cached default card.
  The response is passed through unchanged, including data.ucp.success_info. When completion
  returns data.order.id, use that exact OMS/UCP order ID with ucp-order get. Do not substitute an
  agent_order event's resourceId, data.orderId, or data.paymentOrderId, even when it starts order_.

Examples:
  clink ucp-checkout complete --checkout-id chk_xxx --format json
  clink ucp-checkout complete --checkout-id chk_xxx --payment-instrument-id pi_xxx --format json
`;
var CONFIG_HELP = `clink config

Usage:
  clink config set <key> <value>
  clink config get
  clink config unset <key>

Subcommands:
  set        Update local config
  get        Show local config
  unset      Remove or reset a local config key

Settable Keys:
  base-url
  customer-id
  default-open-links
  email
  name

Notes:
  customer-api-key cannot be stored with config set. Use config unset customer-api-key to remove
  an existing saved legacy key.
  customer-id can be set directly only for wallets that have never used OAuth.
  wallet init stores a single local customer. Running wallet init again overwrites customer
  credentials and clears cached payment methods/risk rules for the previous customer.
`;
var CONFIG_SET_HELP = `clink config set

Usage:
  clink config set <key> <value>

Arguments:
  <key>                        Config key to update
  <value>                      Value to save

Options:
${OUTPUT_OPTIONS}

Settable Keys:
  base-url
  customer-id
  default-open-links
  email
  name

Examples:
  clink config set base-url https://api.clinkbill.com
  clink config set customer-id cus_xxx
  clink config set default-open-links true
`;
var CONFIG_GET_HELP = `clink config get

Usage:
  clink config get [options]

Options:
${OUTPUT_OPTIONS}

Examples:
  clink config get
  clink config get --format pretty
`;
var CONFIG_UNSET_HELP = `clink config unset

Usage:
  clink config unset <key> [options]

Arguments:
  <key>                        Config key to remove or reset

Options:
${OUTPUT_OPTIONS}

Supported Keys:
  base-url
  customer-id
  customer-api-key
  default-open-links
  email
  name

Examples:
  clink config unset customer-api-key
  clink config unset base-url
`;
var INSTRUCTION_HELP = `clink instruction

Usage:
  clink instruction <create|sign-url|list|get|update|cancel> [options]

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
  Agent page URL environment mirrors the environment saved by wallet init or an explicit API base.
  Only valid for Visa cards whose card data has visaRegistrationSucceeded = true.
  Instruction-level currency/amount are NOT sent \u2014 currency and amountLimit live on each mandate.
  When --is-recurring is set, every mandate must include recurringFrequency (WEEKLY, MONTHLY, or YEARLY).
  Do not send clientReferenceId / channelTokenId / consumerId \u2014 the server derives them.
  --effective-until-time / mandate effectiveUntilTime use UTC datetime format "yyyy-MM-dd HH:mm:ss".
  --valid-only lists ACTIVE instructions and, for one-time instructions, keeps only mandates with reserveStatus=0.
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  create/sign-url/update/cancel poll for webhook events after printing the Passkey/agent URL (max 15 min); use --no-watch to skip.

Examples:
  clink instruction create \\
    --payment-instrument-id pi_xxx --title "Business trip" \\
    --effective-until-time "2026-06-25 00:00:00" \\
    --mandates '[{"title":"Hotel","description":"Hotel payment","amountLimit":1000.00,"currencyCode":"USD","merchantCategoryCode":"7011","effectiveUntilTime":"2026-06-25 00:00:00"}]' \\
    --format json
  clink instruction sign-url \\
    --payment-instrument-id pi_xxx --purchase-instruction-id ins_xxx --format json
  clink instruction list --valid-only --payment-instrument-id pi_xxx --format json
  clink instruction get --purchase-instruction-id ins_xxx --format json
  clink instruction cancel --format json
`;
var INSTRUCTION_CREATE_HELP = `clink instruction create

Usage:
  clink instruction create --payment-instrument-id <id> --title <title> \\
    (--mandates <json> | --mandates-file <path>) [options]

Required Arguments:
  --payment-instrument-id <id> Payment instrument ID for the Visa card
  --title <title>              Instruction title
  --mandates <json>            Mandate JSON array; amount and currency live on each mandate
  --mandates-file <path>       UTF-8 JSON array file; accepts files with a BOM

Optional Arguments:
  --description <text>         Instruction description
  --effective-until-time <datetime>
                              Instruction UTC expiry, format yyyy-MM-dd HH:mm:ss
  --is-recurring               Mark the instruction as reusable/recurring
  --shipping-address <json>    Shipping address JSON object for physical goods
  --extra <json>               Extra JSON object passed through to the backend

Options:
  --open                       Open the generated Passkey link in the browser
  --no-watch                   Do not poll for webhook events after printing the link
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  POST /agent/cwallet/instructions

Mandate Fields:
  Common fields include title, description (maximum 150 characters), amountLimit, currencyCode,
  merchantCategoryCode, and effectiveUntilTime.
  When --is-recurring is set, every mandate must include recurringFrequency (WEEKLY, MONTHLY, or YEARLY).

Notes:
  Creates a CREATED draft instruction and prints a Passkey URL. The instruction becomes ACTIVE only
  after the user completes Passkey/FIDO authorization on the agent page.
  --mandates and --mandates-file are mutually exclusive. On Windows PowerShell, prefer
  --mandates-file so JSON quotes are not reinterpreted by the shell.
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  Do not send clientReferenceId, channelTokenId, or consumerId; the server derives them.

Examples:
  clink instruction create \\
    --payment-instrument-id pi_xxx --title "Business trip" \\
    --effective-until-time "2026-06-25 00:00:00" \\
    --mandates '[{"title":"Hotel","description":"Hotel payment","amountLimit":1000.00,"currencyCode":"USD","merchantCategoryCode":"7011","effectiveUntilTime":"2026-06-25 00:00:00"}]' \\
    --format json
  clink instruction create \\
    --payment-instrument-id pi_xxx --title "Business trip" \\
    --mandates-file .\\mandates.json --format json
`;
var INSTRUCTION_SIGN_URL_HELP = `clink instruction sign-url

Usage:
  clink instruction sign-url --payment-instrument-id <id> --purchase-instruction-id <id> [options]

Required Arguments:
  --payment-instrument-id <id>    Payment instrument ID for the Visa card
  --purchase-instruction-id <id>  Purchase instruction ID to authorize

Options:
${CUSTOMER_API_KEY_LINK_OPTIONS}

Notes:
  Builds the Passkey URL locally. The browser page performs the backend sign call with WebAuthn
  authResult after the user authorizes.
  Output includes manualOpenUrl and browserLaunch so callers can handle manual browser fallback.

Examples:
  clink instruction sign-url --payment-instrument-id pi_xxx --purchase-instruction-id ins_xxx --open
`;
var INSTRUCTION_LIST_HELP = `clink instruction list

Usage:
  clink instruction list [options]

Optional Arguments:
  --status <status>              Filter by status: CREATED, ACTIVE, PENDING, INPROGRESS, COMPLETED,
                                 CANCELLED, EXPIRED, DECLINED
  --valid-only                   List ACTIVE instructions only; one-time mandates are filtered to reserveStatus=0
  --payment-instrument-id <id>   Filter by payment instrument ID

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  GET /agent/cwallet/instructions

Notes:
  --valid-only cannot be combined with a non-ACTIVE --status.
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.

Examples:
  clink instruction list --valid-only --payment-instrument-id pi_xxx --format json
  clink instruction list --status ACTIVE --format pretty
`;
var INSTRUCTION_GET_HELP = `clink instruction get

Usage:
  clink instruction get --purchase-instruction-id <id> [options]

Required Arguments:
  --purchase-instruction-id <id>  Purchase instruction ID to fetch

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  GET /agent/cwallet/instructions/{purchaseInstructionId}

Notes:
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.

Examples:
  clink instruction get --purchase-instruction-id ins_xxx --format json
`;
var INSTRUCTION_UPDATE_HELP = `clink instruction update

Usage:
  clink instruction update [options]

Options:
${CUSTOMER_API_KEY_LINK_OPTIONS}

Notes:
  Prints the agent page URL for user-managed changes. The CLI does not call a backend update API
  because updates require Passkey/WebAuthn authorization in the browser.

Examples:
  clink instruction update --open
`;
var INSTRUCTION_CANCEL_HELP = `clink instruction cancel

Usage:
  clink instruction cancel [options]

Options:
${CUSTOMER_API_KEY_LINK_OPTIONS}

Notes:
  Prints the agent page URL for user-managed cancellation. The CLI does not call a backend cancel API
  because cancellation requires Passkey/WebAuthn authorization in the browser.

Examples:
  clink instruction cancel --open
`;
var EVENTS_HELP = `clink events

Usage:
  clink events poll [options]

Subcommands:
  poll              Poll the webhook-event queue for state-change events

Examples:
  clink events poll --format json
  clink events poll --type payment_method.added --format json
`;
var EVENTS_POLL_HELP = `clink events poll

Poll the latest state-change events (POST /agent/event-hub/webhook-events/poll)
within a bounded window, process and cache them, and (by default) acknowledge them via
POST /agent/event-hub/webhook-events/ack. Use this to consume state changes on demand
instead of relying on the link-command watch.

Usage:
  clink events poll [options]

Options:
  --max-wait <seconds>         Bounded window across retries (default 60)
  --limit <n>                  Max events per poll (pageSize, default 20)
  --type <type[,type...]>      Return these exact types (any-of); acknowledge and skip others
  --checkout-id <id>           Match one agent_order event by canonical checkout aliases or the
                               UCP agentInstructionInfo checkout ID; preserve every nonmatch
  --ucp-order-id <id>          Frozen UCP order ID from checkout data; after a verified succeeded
                               event, fetch this order before ACK without re-reading checkout
  --endpoint <url>             Original internal UCP endpoint used to re-read checkout when
                               --ucp-order-id is unavailable
  --payment-instrument-id <id> Match typed card/VIC events to one exact payment instrument
  --next-token <token>         Continue a timed-out Checkout poll from Event Hub's opaque cursor
  --no-ack                     Keep selected events unacknowledged (untyped polls peek the batch)
  --event-only                 ACK and return the exact succeeded event without UCP order lookup
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Output (data):
  { "ready": bool, "timedOut": bool, "events": [...], "ackedEventIds": [...],
    "nextToken"?: string, "paymentConfirmed"?: true, "ucpOrderId"?: string,
    "orderLookupStatus"?: "FETCHED"|"ERROR"|"IDENTIFIER_CONFLICT"|"PENDING",
    "order"?: object, "orderWarning"?: string, "orderResumeCommand"?: string,
    "eventAckWarning"?: string }
  On timeout, "resumeCommand" is included. Ordinary polls need no cursor because ACKed
  events are removed server-side. Checkout polls may also return nextToken, which the
  generated resumeCommand carries automatically, together with --ucp-order-id and --endpoint.

Notes:
  Every record read is processed: payment_method.* events refresh cached payment methods
  and risk_rule.updated events upsert local risk rule state. With --type, "events" contains
  only matching records; a comma-separated list waits for any listed type. Unrelated records
  are acknowledged and skipped so an older page cannot block the requested type. Matching
  records are also acknowledged by default.
  With both --type and --no-ack, matching records stay queued but unrelated records are still
  acknowledged. Without --type, a poll returns the whole batch and --no-ack acknowledges none.
  --checkout-id requires exactly agent_order.succeeded or agent_order.failed. The request sends
  eventTypes plus selectors.checkoutId to Event Hub before pagination. Event Hub returns nextToken
  so the CLI can continue past unacknowledged events owned by another Checkout. Missing, malformed,
  or conflicting checkout aliases fail closed; resourceId/orderId never substitute. A full page
  without nextToken fails explicitly instead of polling the same page forever. Only an exact match
  with absent or mutually consistent Payment Order aliases is eligible for ACK; malformed aliases
  stay queued. resumeCommand preserves the selector and nextToken.
  By default an agent_order.succeeded selected with --checkout-id continues in the same process
  to UCP order lookup while the event remains queued, then ACKs immediately before output.
  --ucp-order-id is the fast path and is the only supplied ID passed
  to ucp-order get; event resourceId/orderId remain Payment Order IDs and are never reused. Without
  --ucp-order-id, the CLI re-reads the same checkout (and --endpoint) immediately, then after
  1/2/4/8 seconds while projection is pending, and accepts only mutually consistent canonical,
  legacy OMS, or completed data.order identifiers. Checkout/order lookup failures keep
  paymentConfirmed=true, exit 0, and return a separate warning/resume command. An uncertain ACK
  also exits 0 with payment evidence plus eventAckWarning, so a later harmless duplicate can be
  observed. --no-ack and --event-only suppress this automatic lookup.
  --payment-instrument-id requires --type, is mutually exclusive with --checkout-id, and matches
  canonical payload aliases or the event resourceId. Same-type events for another card remain
  unacknowledged, and resumeCommand preserves the card selector.

Examples:
  clink events poll --format json
  clink events poll --type payment_method.updated --format json
  clink events poll --type payment_method.update,vic_device.binding_succeeded --payment-instrument-id pi_123 --format json
  clink events poll --type account-created,account-reloaded --format json
  clink events poll --type agent_order.succeeded --checkout-id checkout_123 --format json
  clink events poll --type agent_order.succeeded --checkout-id checkout_123 --ucp-order-id ucp_order_123 --max-wait 900 --format json
  clink events poll --no-ack --format json
`;
function printHelp(command, subcommand, nestedCommand, executableName = MAIN_EXECUTABLE_NAME) {
  const output = getHelpText(command, subcommand, nestedCommand, executableName);
  process.stdout.write(output);
}
function getHelpText(command, subcommand, nestedCommand, executableName = MAIN_EXECUTABLE_NAME) {
  const help = getRawHelpText(command, subcommand, nestedCommand);
  return renderCliCommandText(help, executableName);
}
function getRawHelpText(command, subcommand, nestedCommand) {
  switch (command) {
    case "skills":
      switch (subcommand) {
        case "list":
          return SKILLS_LIST_HELP;
        case "install":
          return SKILLS_INSTALL_HELP;
        case "tip":
          return SKILLS_TIP_HELP;
        default:
          return SKILLS_HELP;
      }
    case "wallet":
      switch (subcommand) {
        case "init":
          return WALLET_INIT_HELP;
        case "logout":
          return WALLET_LOGOUT_HELP;
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
        case "passkey-link":
          return CARD_PASSKEY_LINK_HELP;
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
      switch (subcommand) {
        case "create":
          return INSTRUCTION_CREATE_HELP;
        case "sign-url":
          return INSTRUCTION_SIGN_URL_HELP;
        case "list":
          return INSTRUCTION_LIST_HELP;
        case "get":
          return INSTRUCTION_GET_HELP;
        case "update":
          return INSTRUCTION_UPDATE_HELP;
        case "cancel":
          return INSTRUCTION_CANCEL_HELP;
        default:
          return INSTRUCTION_HELP;
      }
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
        case "parse-site":
          return TOOL_PARSE_SITE_HELP;
        case "parse-item":
          return TOOL_PARSE_ITEM_HELP;
        case "checkout-total":
          return TOOL_CHECKOUT_TOTAL_HELP;
        case "get-ucp-profile":
          return TOOL_GET_UCP_PROFILE_HELP;
        case "get-rest-endpoint":
          return TOOL_GET_REST_ENDPOINT_HELP;
        case "internal-ucp":
          switch (nestedCommand) {
            case "get-endpoint":
              return TOOL_INTERNAL_UCP_GET_ENDPOINT_HELP;
            case "get-merchant-list":
              return TOOL_INTERNAL_UCP_GET_MERCHANT_LIST_HELP;
            default:
              return TOOL_INTERNAL_UCP_HELP;
          }
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
      switch (subcommand) {
        case "run":
          return UCP_CHECKOUT_RUN_HELP;
        case "create":
          return UCP_CHECKOUT_CREATE_HELP;
        case "get":
          return UCP_CHECKOUT_GET_HELP;
        case "update":
          return UCP_CHECKOUT_UPDATE_HELP;
        case "cancel":
          return UCP_CHECKOUT_CANCEL_HELP;
        case "complete":
          return UCP_CHECKOUT_COMPLETE_HELP;
        default:
          return UCP_CHECKOUT_HELP;
      }
    case "ucp-catalog":
      switch (subcommand) {
        case "search":
          return UCP_CATALOG_SEARCH_HELP;
        case "product":
          return UCP_CATALOG_PRODUCT_HELP;
        default:
          return UCP_CATALOG_HELP;
      }
    case "ucp-merchant":
      switch (subcommand) {
        case "list":
          return UCP_MERCHANT_LIST_HELP;
        default:
          return UCP_MERCHANT_HELP;
      }
    case "catalog":
      switch (subcommand) {
        case "search":
          return CATALOG_SEARCH_HELP;
        default:
          return CATALOG_HELP;
      }
    case "ucp-order":
      switch (subcommand) {
        case "get":
          return UCP_ORDER_GET_HELP;
        case "wait-delivery":
          return UCP_ORDER_WAIT_DELIVERY_HELP;
        case "list":
          return UCP_ORDER_LIST_HELP;
        default:
          return UCP_ORDER_HELP;
      }
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

// dist/internal-ucp.js
var MERCHANT_LIST_PATH = "/agent/ucp/merchants";
var MERCHANT_LIST_USER_AGENT = "clink-cli";
var MERCHANT_LIST_TIMEOUT_MS = 15e3;
var MERCHANT_LIST_CACHE_TTL_MS = 3e4;
var MERCHANT_LIST_MAX_ATTEMPTS = 2;
var MERCHANT_LIST_RETRY_DELAY_MS = 50;
var merchantListRequests = /* @__PURE__ */ new WeakMap();
async function getInternalUcpMerchantList(options2 = {}) {
  return (await loadInternalUcpMerchantList(options2)).merchants;
}
function validateInternalUcpMerchantList(value, source) {
  if (!Array.isArray(value)) {
    throw invalidMerchantList(source, "expected an array");
  }
  const merchants = [];
  for (const record of value) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      continue;
    }
    const fields = record;
    const merchantId = nonBlankString(fields.merchant_id);
    const merchantName = nonBlankString(fields.merchant_name);
    const description = optionalDescription(fields.description);
    const domain = merchantRouteUrl(fields.domain);
    if (!merchantId || !merchantName || description === void 0 || !domain) {
      continue;
    }
    merchants.push({
      merchant_id: merchantId,
      merchant_name: merchantName,
      description,
      domain
    });
  }
  if (value.length > 0 && merchants.length === 0) {
    throw invalidMerchantList(source, "no valid merchant identities");
  }
  return merchants;
}
async function resolveInternalUcpEndpoint(rawProductUrl, options2 = {}) {
  let productUrl;
  try {
    productUrl = new URL(rawProductUrl);
  } catch {
    throw validationError("invalid --product-url");
  }
  const environment = options2.environment ?? "production";
  const domainName = canonicalDomain(productUrl.hostname);
  if (!domainName) {
    throw validationError("NOT_IN_INTERNAL_UCP_LIST");
  }
  let merchantId;
  if (options2.merchants) {
    merchantId = options2.merchants.get(domainName);
  } else {
    let loaded = await loadInternalUcpMerchants(options2);
    merchantId = loaded.merchants.get(domainName);
    if (!merchantId && loaded.fromCache) {
      loaded = await loadInternalUcpMerchants(options2, true);
      merchantId = loaded.merchants.get(domainName);
    }
  }
  if (!merchantId) {
    throw validationError("NOT_IN_INTERNAL_UCP_LIST");
  }
  const baseUrl = options2.baseUrl ?? API_BASE_URLS[environment];
  let endpoint;
  try {
    endpoint = new URL(`/agent/ucp/${encodeURIComponent(merchantId)}`, baseUrl);
  } catch {
    throw validationError("invalid internal UCP base URL");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:" || endpoint.username || endpoint.password || !canonicalDomain(endpoint.hostname) || endpoint.port === "0" || endpoint.search || endpoint.hash) {
    throw validationError("invalid internal UCP base URL");
  }
  return {
    domainName,
    merchantId,
    provider: "clinkbill",
    endpoint: endpoint.toString()
  };
}
async function loadInternalUcpMerchants(options2, forceRefresh = false) {
  const loaded = await loadInternalUcpMerchantList(options2, forceRefresh);
  const environment = options2.environment ?? "production";
  const source = new URL(MERCHANT_LIST_PATH, API_BASE_URLS[environment]).toString();
  return {
    merchants: merchantMap(loaded.merchants, source),
    fromCache: loaded.fromCache
  };
}
async function loadInternalUcpMerchantList(options2, forceRefresh = false) {
  const environment = options2.environment ?? "production";
  const url = new URL(MERCHANT_LIST_PATH, API_BASE_URLS[environment]).toString();
  const fetchMerchantList = options2.fetchMerchantList ?? fetch;
  let requestsByUrl = merchantListRequests.get(fetchMerchantList);
  if (!requestsByUrl) {
    requestsByUrl = /* @__PURE__ */ new Map();
    merchantListRequests.set(fetchMerchantList, requestsByUrl);
  }
  let state = requestsByUrl.get(url);
  if (!state) {
    state = {};
    requestsByUrl.set(url, state);
  }
  const now = Date.now();
  if (!forceRefresh && state.cached && state.cached.expiresAt > now) {
    return { merchants: cloneMerchantList(state.cached.merchants), fromCache: true };
  }
  const timeoutMs = options2.timeoutMs ?? MERCHANT_LIST_TIMEOUT_MS;
  const inFlight = state.inFlightByTimeout?.get(timeoutMs);
  if (inFlight) {
    return { merchants: cloneMerchantList(await inFlight), fromCache: false };
  }
  const requestState = state;
  const request = (async () => {
    const document2 = await fetchMerchantListDocument(url, timeoutMs, fetchMerchantList);
    const validated = validateInternalUcpMerchantList(document2, url).map((merchant) => Object.freeze({ ...merchant }));
    const cached = Object.freeze(validated);
    requestState.cached = {
      expiresAt: Date.now() + MERCHANT_LIST_CACHE_TTL_MS,
      merchants: cached
    };
    return cached;
  })();
  requestState.inFlightByTimeout ??= /* @__PURE__ */ new Map();
  requestState.inFlightByTimeout.set(timeoutMs, request);
  try {
    return { merchants: cloneMerchantList(await request), fromCache: false };
  } finally {
    if (requestState.inFlightByTimeout?.get(timeoutMs) === request) {
      requestState.inFlightByTimeout.delete(timeoutMs);
      if (requestState.inFlightByTimeout.size === 0) {
        delete requestState.inFlightByTimeout;
      }
    }
  }
}
async function fetchMerchantListDocument(url, timeoutMs = MERCHANT_LIST_TIMEOUT_MS, fetchMerchantList = fetch) {
  const deadline = Date.now() + timeoutMs;
  let lastFailure;
  for (let attempt = 1; attempt <= MERCHANT_LIST_MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);
    let response;
    try {
      response = await fetchMerchantList(url, {
        method: "GET",
        credentials: "omit",
        headers: {
          Accept: "application/json",
          "Accept-Language": "en-US",
          "User-Agent": MERCHANT_LIST_USER_AGENT,
          [CLI_VERSION_HEADER]: CLI_VERSION
        },
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      lastFailure = merchantListNetworkFailure(error, timeoutMs);
      if (attempt < MERCHANT_LIST_MAX_ATTEMPTS && await waitForMerchantListRetry(deadline)) {
        continue;
      }
      throw lastFailure;
    }
    if (!response.ok) {
      clearTimeout(timeout);
      discardMerchantListResponse(response);
      lastFailure = apiError(`internal UCP merchant list request failed with status ${response.status}`, response.status);
      if (retryableMerchantListStatus(response.status) && attempt < MERCHANT_LIST_MAX_ATTEMPTS && await waitForMerchantListRetry(deadline)) {
        continue;
      }
      throw lastFailure;
    }
    let rawText;
    try {
      rawText = await response.text();
    } catch (error) {
      clearTimeout(timeout);
      lastFailure = merchantListNetworkFailure(error, timeoutMs, true);
      if (attempt < MERCHANT_LIST_MAX_ATTEMPTS && await waitForMerchantListRetry(deadline)) {
        continue;
      }
      throw lastFailure;
    } finally {
      clearTimeout(timeout);
    }
    try {
      return JSON.parse(rawText);
    } catch {
      throw apiError("internal UCP merchant list response is not valid JSON", 502);
    }
  }
  throw lastFailure ?? networkError(`internal UCP merchant list request timed out after ${timeoutMs}ms`);
}
function merchantRouteUrl(value) {
  const rawDomain = nonBlankString(value);
  if (!rawDomain) {
    return void 0;
  }
  if (/[\\?#]/.test(rawDomain) || /[\u0000-\u0020\u007f]/.test(rawDomain) || /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*@/i.test(rawDomain)) {
    return void 0;
  }
  let domain;
  try {
    domain = new URL(rawDomain);
  } catch {
    return void 0;
  }
  const domainName = canonicalDomain(domain.hostname);
  if (domain.protocol !== "http:" && domain.protocol !== "https:" || domain.username || domain.password || domain.search || domain.hash || !domainName || domain.port === "0") {
    return void 0;
  }
  domain.hostname = domainName;
  if (domain.protocol === "http:" && domain.port === "80" || domain.protocol === "https:" && domain.port === "443") {
    domain.port = "";
  }
  return domain.pathname === "/" ? domain.origin : `${domain.origin}${domain.pathname}`;
}
function nonBlankString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function stringValue(value) {
  return typeof value === "string" ? value.trim() : void 0;
}
function optionalDescription(value) {
  return value === null || value === void 0 ? "" : stringValue(value);
}
function canonicalDomain(value) {
  return nonBlankString(value)?.toLowerCase().replace(/\.+$/, "");
}
function merchantMap(merchants, source) {
  const merchantIdsByDomain = /* @__PURE__ */ new Map();
  for (const merchant of merchants) {
    const domainName = canonicalDomain(new URL(merchant.domain).hostname);
    if (!domainName) {
      continue;
    }
    const merchantIds = merchantIdsByDomain.get(domainName) ?? /* @__PURE__ */ new Set();
    merchantIds.add(merchant.merchant_id);
    merchantIdsByDomain.set(domainName, merchantIds);
  }
  const mapped = new ConflictAwareMerchantMap(source);
  for (const [domainName, merchantIds] of merchantIdsByDomain) {
    if (merchantIds.size === 1) {
      mapped.set(domainName, merchantIds.values().next().value);
    } else {
      mapped.addConflict(domainName);
    }
  }
  return mapped;
}
var ConflictAwareMerchantMap = class extends Map {
  source;
  conflicts = /* @__PURE__ */ new Set();
  constructor(source) {
    super();
    this.source = source;
  }
  addConflict(domainName) {
    this.delete(domainName);
    this.conflicts.add(domainName);
  }
  get(domainName) {
    this.assertUnambiguous(domainName);
    return super.get(domainName);
  }
  has(domainName) {
    this.assertUnambiguous(domainName);
    return super.has(domainName);
  }
  assertUnambiguous(domainName) {
    if (this.conflicts.has(domainName)) {
      throw invalidMerchantList(this.source, `conflicting merchant IDs for domain: ${domainName}`);
    }
  }
};
function cloneMerchantList(merchants) {
  return merchants.map((merchant) => ({ ...merchant }));
}
function retryableMerchantListStatus(status) {
  return status === 408 || status === 429 || status >= 500 && status <= 599;
}
function discardMerchantListResponse(response) {
  if (response.body) {
    void response.body.cancel().catch(() => {
    });
  }
}
async function waitForMerchantListRetry(deadline) {
  if (deadline - Date.now() <= MERCHANT_LIST_RETRY_DELAY_MS) {
    return false;
  }
  await new Promise((resolve4) => {
    setTimeout(resolve4, MERCHANT_LIST_RETRY_DELAY_MS);
  });
  return Date.now() < deadline;
}
function merchantListNetworkFailure(error, timeoutMs, responseBody = false) {
  if (error?.name === "AbortError") {
    return networkError(`internal UCP merchant list request timed out after ${timeoutMs}ms`);
  }
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : responseBody ? "network response failed" : "network request failed";
  return networkError(`internal UCP merchant list ${responseBody ? "response" : "request"} failed: ${message}`);
}
function invalidMerchantList(source, reason) {
  return apiError(`invalid internal UCP merchant list from ${source}: ${reason}`, 502);
}

// dist/instruction-context.js
import { readFile as readFile3 } from "node:fs/promises";
var RECURRING_FREQUENCIES = ["WEEKLY", "MONTHLY", "YEARLY"];
var RECURRING_FREQUENCY_SET = new Set(RECURRING_FREQUENCIES);
var UTC_DATETIME_FORMAT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
var QUICK_INSTRUCTION_CONTEXT_MAX_BYTES = 16 * 1024;
var MAX_MANDATE_DESCRIPTION_LENGTH = 150;
var QUICK_INSTRUCTION_CONTEXT_FLAGS = [
  "title",
  "description",
  "mandates",
  "mandates-file",
  "is-recurring",
  "shipping-address",
  "effective-until-time"
];
var QUICK_INSTRUCTION_OPTIONS = [
  ...QUICK_INSTRUCTION_CONTEXT_FLAGS,
  "payment-instrument-id",
  "extra"
];
async function buildQuickInstructionContext(flags, commandLabel) {
  if ("payment-instrument-id" in flags) {
    throw validationError(`--payment-instrument-id is not supported by ${commandLabel}; the card is bound after login`);
  }
  if ("extra" in flags) {
    throw validationError(`--extra is not supported by the ${commandLabel} Quick Instruction context`);
  }
  if (!QUICK_INSTRUCTION_CONTEXT_FLAGS.some((name) => name in flags)) {
    return void 0;
  }
  const title = requireNonBlankStringFlag(flags, "missing --title", "title");
  if (title.length > 256) {
    throw validationError(`--title must be at most 256 characters, got ${title.length}`);
  }
  const description = getStringFlag(flags, "description");
  if (description !== void 0 && description.length > 1024) {
    throw validationError(`--description must be at most 1024 characters, got ${description.length}`);
  }
  const isRecurring = getBooleanFlag(flags, "is-recurring");
  const mandates = normalizeInstructionMandates(await readInstructionMandates(flags), isRecurring, { maxEntries: 10, requireCoreFields: true });
  const effectiveUntilTime = utcDateTimeFlag(flags, "effective-until-time");
  const context = {
    title,
    mandates,
    ...description !== void 0 ? { description } : {},
    ...effectiveUntilTime !== void 0 ? { effectiveUntilTime } : {},
    ...isRecurring ? { isRecurring: true } : {}
  };
  const shippingAddress = optionalJsonObjectFlag(flags, "shipping-address");
  if (shippingAddress !== void 0) {
    context.shippingAddress = shippingAddress;
  }
  const contextBytes = Buffer.byteLength(JSON.stringify(context), "utf8");
  if (contextBytes > QUICK_INSTRUCTION_CONTEXT_MAX_BYTES) {
    throw validationError(`${commandLabel} instruction context must be at most 16384 UTF-8 bytes, got ${contextBytes}`);
  }
  return context;
}
async function readInstructionMandates(flags) {
  const inlineJson = getStringFlag(flags, "mandates");
  const filePath = getStringFlag(flags, "mandates-file");
  if (inlineJson !== void 0 && filePath !== void 0) {
    throw validationError("--mandates and --mandates-file cannot be used together");
  }
  if (inlineJson === void 0 && filePath === void 0) {
    throw validationError("missing --mandates or --mandates-file (JSON array)");
  }
  let source = inlineJson;
  let sourceName = "--mandates";
  if (filePath !== void 0) {
    if (!filePath.trim()) {
      throw validationError("--mandates-file path must not be blank");
    }
    sourceName = "--mandates-file";
    try {
      source = await readFile3(filePath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw validationError(`could not read --mandates-file "${filePath}": ${message}`);
    }
  }
  const parsed = parseJsonFlag(source, sourceName);
  if (!Array.isArray(parsed)) {
    throw validationError(`${sourceName} must be a JSON array`);
  }
  return parsed;
}
function normalizeInstructionMandates(mandates, isRecurring, options2 = {}) {
  if (options2.requireCoreFields && mandates.length === 0) {
    throw validationError("--mandates must contain at least one entry");
  }
  if (options2.maxEntries !== void 0 && mandates.length > options2.maxEntries) {
    throw validationError(`--mandates cannot exceed ${options2.maxEntries} entries, got ${mandates.length}`);
  }
  return mandates.map((mandate, index) => {
    if (!isJsonObject(mandate)) {
      if (options2.requireCoreFields) {
        throw validationError(`--mandates[${index}] must be a JSON object`);
      }
      if (isRecurring) {
        throw validationError(`--mandates[${index}] must be a JSON object when --is-recurring is set`);
      }
      return mandate;
    }
    if (typeof mandate.description === "string" && mandate.description.length > MAX_MANDATE_DESCRIPTION_LENGTH) {
      throw validationError(`--mandates[${index}].description must not exceed ${MAX_MANDATE_DESCRIPTION_LENGTH} characters`);
    }
    if (options2.requireCoreFields) {
      requireMandateText(mandate, "description", index);
      requireMandateAmountLimit(mandate, index);
      requireMandateText(mandate, "currencyCode", index);
      validateUtcDateTime(mandate.effectiveUntilTime, `--mandates[${index}].effectiveUntilTime`);
    }
    if (!isRecurring) {
      return mandate;
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
  if (!UTC_DATETIME_FORMAT.test(value)) {
    throw validationError(`--${name} must use UTC datetime format yyyy-MM-dd HH:mm:ss, got "${value}"`);
  }
  return value;
}
function requireNonBlankStringFlag(flags, missingMessage, name) {
  const value = requireStringFlag(flags, missingMessage, name);
  if (!value.trim()) {
    throw validationError(`--${name} is required and cannot be blank`);
  }
  return value;
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
function validateUtcDateTime(value, field) {
  if (value === void 0 || value === null) {
    return;
  }
  if (typeof value !== "string" || !UTC_DATETIME_FORMAT.test(value)) {
    throw validationError(`${field} must use UTC datetime format yyyy-MM-dd HH:mm:ss`);
  }
}
function requireMandateText(mandate, field, index) {
  const value = mandate[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw validationError(`--mandates[${index}].${field} is required and cannot be blank`);
  }
}
function requireMandateAmountLimit(mandate, index) {
  const value = mandate.amountLimit;
  if (value === void 0 || value === null) {
    throw validationError(`--mandates[${index}].amountLimit is required`);
  }
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,18}(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
    throw validationError(`--mandates[${index}].amountLimit must be a positive number with at most 2 decimal places, got ${JSON.stringify(value)}`);
  }
  if (typeof value === "number") {
    const [integerPart, fractionPart = ""] = text.split(".");
    const minorUnits = Number(`${integerPart}${fractionPart.padEnd(2, "0")}`);
    if (!Number.isSafeInteger(minorUnits)) {
      throw validationError(`--mandates[${index}].amountLimit is too precise for a JSON number; provide it as a JSON string`);
    }
  }
}
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/oauth.js
import { randomUUID as randomUUID2 } from "node:crypto";
var OAUTH_CLIENT_ID = "clink-cli";
var OAUTH_DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
var OAUTH_REFRESH_GRANT_TYPE = "refresh_token";
var OAUTH_DEFAULT_SCOPE = [
  "wallet:read",
  "wallet:setup",
  "payment:execute",
  "instruction:read",
  "instruction:write",
  "browser:handoff",
  "refund:read",
  "refund:write",
  "events:read",
  "offline_access"
].join(" ");
var OAUTH_DEVICE_AUTHORIZATION_PATH = "/agent/cwallet/oauth/device/authorization";
var OAUTH_TOKEN_PATH = "/agent/cwallet/oauth/token";
var OAUTH_REVOKE_PATH = "/agent/cwallet/oauth/revoke";
var DEFAULT_SERVER_POLL_INTERVAL_SECONDS = 5;
var CLIENT_POLL_PADDING_SECONDS = 1;
var SLOW_DOWN_INCREMENT_SECONDS = 5;
var ACCESS_TOKEN_REFRESH_WINDOW_MS = 6e4;
var WALLET_INIT_SUPERSEDED_MESSAGE = "A newer wallet init started; this login attempt has been cancelled.";
var OAuthProtocolError = class extends Error {
  errorCode;
  status;
  constructor(errorCode, description, status) {
    super(description || errorCode);
    this.name = "OAuthProtocolError";
    this.errorCode = errorCode;
    this.status = status;
  }
};
function resolveOAuthDeviceId(config) {
  return config.authorization?.deviceId ?? randomUUID2();
}
async function createDeviceAuthorization(options2) {
  const result = await requestJson({
    baseUrl: options2.baseUrl,
    method: "POST",
    path: OAUTH_DEVICE_AUTHORIZATION_PATH,
    body: {
      client_id: OAUTH_CLIENT_ID,
      device_id: options2.deviceId,
      scope: options2.scope ?? OAUTH_DEFAULT_SCOPE,
      source: OAUTH_CLIENT_ID,
      agentClient: options2.agentClient,
      ...options2.instructionContext ? { instruction_context: options2.instructionContext } : {}
    },
    timeoutMs: options2.timeoutMs,
    dryRun: options2.dryRun
  });
  if (isDryRun2(result)) {
    return result;
  }
  const data = requireOAuthSuccess(result);
  return {
    deviceCode: requiredString2(data.device_code, "OAuth response is missing device_code"),
    userCode: requiredString2(data.user_code, "OAuth response is missing user_code"),
    verificationUri: requiredString2(data.verification_uri, "OAuth response is missing verification_uri"),
    verificationUriComplete: requiredString2(data.verification_uri_complete, "OAuth response is missing verification_uri_complete"),
    expiresIn: positiveNumber(data.expires_in, "OAuth response has invalid expires_in"),
    interval: nonNegativeNumber(data.interval) ?? DEFAULT_SERVER_POLL_INTERVAL_SECONDS
  };
}
function buildVerificationUrl(authorization, email, name) {
  const url = new URL(authorization.verificationUriComplete);
  if (!url.searchParams.has("user_code")) {
    url.searchParams.set("user_code", authorization.userCode);
  }
  url.searchParams.delete("email");
  url.searchParams.delete("name");
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  fragment.set("email", email);
  fragment.set("name", name);
  url.hash = fragment.toString();
  return url.toString();
}
async function pollDeviceToken(options2) {
  const deadline = Date.now() + options2.expiresIn * 1e3;
  let intervalSeconds = (nonNegativeNumber(options2.interval) ?? DEFAULT_SERVER_POLL_INTERVAL_SECONDS) + CLIENT_POLL_PADDING_SECONDS;
  for (; ; ) {
    await assertWalletInitIsCurrent(options2.isCurrent);
    if (Date.now() >= deadline) {
      throw authError("Authorization expired; run `clink wallet init` again.");
    }
    try {
      const token = await requestToken({
        baseUrl: options2.baseUrl,
        timeoutMs: options2.timeoutMs,
        requireAgentClientId: true,
        body: {
          grant_type: OAUTH_DEVICE_GRANT_TYPE,
          client_id: OAUTH_CLIENT_ID,
          device_id: options2.deviceId,
          device_code: options2.deviceCode
        }
      });
      return token;
    } catch (error) {
      if (!(error instanceof OAuthProtocolError)) {
        throw error;
      }
      if (error.errorCode === "authorization_pending") {
        await sleepUntilNextPoll(intervalSeconds, deadline, options2.sleep ?? sleep2);
        continue;
      }
      if (error.errorCode === "slow_down") {
        intervalSeconds += SLOW_DOWN_INCREMENT_SECONDS;
        await sleepUntilNextPoll(intervalSeconds, deadline, options2.sleep ?? sleep2);
        continue;
      }
      throw publicOAuthError(error, "device");
    }
  }
}
function toStoredAuthorization(deviceId, token, issuerBaseUrl, now = Date.now(), sessionId = randomUUID2()) {
  const issuerOrigin = httpOrigin(issuerBaseUrl);
  if (!issuerOrigin) {
    throw configError("OAuth issuer must be an absolute http(s) URL");
  }
  return {
    type: "oauth",
    customerId: token.customerId,
    customerIdVerified: true,
    sessionId,
    deviceId,
    issuerOrigin,
    tokenType: "Bearer",
    accessToken: token.accessToken,
    accessTokenExpiresAt: now + token.expiresIn * 1e3,
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: now + token.refreshExpiresIn * 1e3,
    ...token.agentClientId ? { agentClientId: token.agentClientId } : {},
    ...token.visaRegistrationStatus ? { visaRegistrationStatus: token.visaRegistrationStatus } : {},
    scope: token.scope
  };
}
async function ensureFreshOAuthAuthorization(options2) {
  const authorization = options2.storedConfig.authorization;
  if (!authorization) {
    return options2.storedConfig;
  }
  assertAuthorizationEnvironment(authorization, options2.runtimeBaseUrl);
  if (authorization.customerIdVerified && !options2.force && isAccessTokenFresh(authorization, options2.minimumValidityMs)) {
    return options2.storedConfig;
  }
  const expectedAuthorization = {
    accessToken: authorization.accessToken,
    customerId: authorization.customerId,
    issuerOrigin: authorization.issuerOrigin,
    deviceId: authorization.deviceId,
    ...authorization.sessionId ? { sessionId: authorization.sessionId } : {}
  };
  return refreshStoredAuthorization({ ...options2, expectedAuthorization });
}
async function revokeStoredAuthorization(options2) {
  const result = await requestJson({
    baseUrl: options2.authorization.issuerOrigin,
    method: "POST",
    path: OAUTH_REVOKE_PATH,
    body: {
      client_id: OAUTH_CLIENT_ID,
      device_id: options2.authorization.deviceId,
      refresh_token: options2.authorization.refreshToken
    },
    timeoutMs: options2.timeoutMs,
    dryRun: options2.dryRun
  });
  if (isDryRun2(result)) {
    return result;
  }
  requireOAuthSuccess(result);
  return { revoked: true };
}
function assertAuthorizationEnvironment(authorization, runtimeBaseUrl) {
  if (!sameHttpOrigin(authorization.issuerOrigin, runtimeBaseUrl)) {
    throw configError("saved OAuth authorization belongs to a different API environment; run `clink wallet init` for the selected wallet environment");
  }
}
function isAccessTokenFresh(authorization, minimumValidityMs = ACCESS_TOKEN_REFRESH_WINDOW_MS) {
  return authorization.accessTokenExpiresAt > Date.now() + minimumValidityMs;
}
function clearOAuthAndLegacyCredentials(config) {
  delete config.authorization;
  delete config.customerApiKey;
}
async function refreshStoredAuthorization(options2) {
  let refreshFailure;
  const updated = await updateStoredConfig(async (current) => {
    const authorization = current.authorization;
    if (!authorization) {
      refreshFailure = authError("OAuth login is missing; run `clink wallet init`.");
      return current;
    }
    assertAuthorizationEnvironment(authorization, options2.runtimeBaseUrl);
    if (!matchesAuthorizationIdentity(current, options2.expectedAuthorization)) {
      refreshFailure = authError(options2.failedAuthorization ? "OAuth login changed while the request was in progress; retry the command." : "OAuth login changed while the command was in progress; retry the command.");
      return current;
    }
    if (options2.failedAuthorization && !matchesAuthorizationIdentity(current, options2.failedAuthorization)) {
      refreshFailure = authError("OAuth login changed while the request was in progress; retry the command.");
      return current;
    }
    if (options2.failedAuthorization && authorization.accessToken !== options2.failedAuthorization.accessToken) {
      return current;
    }
    if (authorization.customerIdVerified && !options2.force && isAccessTokenFresh(authorization, options2.minimumValidityMs)) {
      return current;
    }
    if (authorization.refreshTokenExpiresAt <= Date.now()) {
      clearOAuthAndLegacyCredentials(current);
      refreshFailure = authError("OAuth session expired; run `clink wallet init` again.");
      return current;
    }
    try {
      const token = await requestToken({
        baseUrl: authorization.issuerOrigin,
        timeoutMs: options2.timeoutMs,
        body: {
          grant_type: OAUTH_REFRESH_GRANT_TYPE,
          client_id: OAUTH_CLIENT_ID,
          device_id: authorization.deviceId,
          refresh_token: authorization.refreshToken
        }
      });
      const customerChanged = token.customerId !== authorization.customerId;
      if (authorization.customerIdVerified && customerChanged) {
        refreshFailure = authError("OAuth refresh returned a different customer; run `clink wallet init` again.");
        return current;
      }
      if (authorization.agentClientId && token.agentClientId && authorization.agentClientId !== token.agentClientId) {
        refreshFailure = authError("OAuth refresh returned a different Agent Client; run `clink wallet init` again.");
        return current;
      }
      current.authorization = toStoredAuthorization(authorization.deviceId, token, authorization.issuerOrigin, Date.now(), authorization.sessionId);
      if (!current.authorization.agentClientId && authorization.agentClientId) {
        current.authorization.agentClientId = authorization.agentClientId;
      }
      if (!current.authorization.visaRegistrationStatus && authorization.visaRegistrationStatus) {
        current.authorization.visaRegistrationStatus = authorization.visaRegistrationStatus;
      }
      current.customerId = token.customerId;
      if (customerChanged) {
        delete current.paymentMethods;
        delete current.riskRules;
      }
      return current;
    } catch (error) {
      if (error instanceof OAuthProtocolError && error.errorCode === "invalid_grant") {
        clearOAuthAndLegacyCredentials(current);
        refreshFailure = authError("OAuth session is invalid or revoked; run `clink wallet init` again.");
        return current;
      }
      throw error instanceof OAuthProtocolError ? publicOAuthError(error, "refresh") : error;
    }
  });
  if (refreshFailure) {
    throw refreshFailure;
  }
  return updated;
}
function matchesAuthorizationIdentity(config, failedAuthorization) {
  const authorization = config.authorization;
  return Boolean(authorization && authorization.customerId === failedAuthorization.customerId && authorization.issuerOrigin === failedAuthorization.issuerOrigin && authorization.deviceId === failedAuthorization.deviceId && (failedAuthorization.sessionId === void 0 || authorization.sessionId === failedAuthorization.sessionId));
}
async function requestToken(options2) {
  const result = await requestJson({
    baseUrl: options2.baseUrl,
    method: "POST",
    path: OAUTH_TOKEN_PATH,
    body: options2.body,
    timeoutMs: options2.timeoutMs,
    dryRun: false
  });
  if (isDryRun2(result)) {
    throw apiError("unexpected OAuth token dry-run response");
  }
  const data = requireOAuthSuccess(result);
  const tokenType = requiredString2(data.token_type, "OAuth response is missing token_type");
  if (tokenType.toLowerCase() !== "bearer") {
    throw apiError(`unsupported OAuth token type: ${tokenType}`);
  }
  const agentClientId = options2.requireAgentClientId ? requiredString2(data.agent_client_id, "OAuth response is missing agent_client_id") : optionalString(data.agent_client_id);
  const visaRegistrationStatus = parseVisaRegistrationStatus2(data.visa_registration_status, options2.requireAgentClientId);
  const pendingInstructionId = optionalString(data.pending_instruction_id ?? data.pendingInstructionId);
  return {
    tokenType: "Bearer",
    accessToken: requiredString2(data.access_token, "OAuth response is missing access_token"),
    expiresIn: positiveNumber(data.expires_in, "OAuth response has invalid expires_in"),
    refreshToken: requiredString2(data.refresh_token, "OAuth response is missing refresh_token; offline_access is required"),
    refreshExpiresIn: positiveNumber(data.refresh_expires_in, "OAuth response has invalid refresh_expires_in"),
    customerId: requiredString2(data.customer_id, "OAuth response is missing customer_id"),
    ...agentClientId ? { agentClientId } : {},
    ...visaRegistrationStatus ? { visaRegistrationStatus } : {},
    ...pendingInstructionId ? { pendingInstructionId } : {},
    scope: requiredString2(data.scope, "OAuth response is missing scope")
  };
}
function requireOAuthSuccess(response) {
  const oauthError = parseOAuthError(response.body);
  if (oauthError) {
    throw new OAuthProtocolError(oauthError.error, oauthError.errorDescription, response.status);
  }
  if (response.status < 200 || response.status >= 300) {
    throw apiError(extractMessage(response.body) ?? `OAuth request failed with status ${response.status}`, response.status);
  }
  const body = unwrapResponseData(response.body);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw apiError("OAuth response body is invalid");
  }
  return body;
}
function parseOAuthError(body) {
  const candidate = unwrapResponseData(body);
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return void 0;
  }
  const record = candidate;
  if (typeof record.error !== "string" || record.error.length === 0) {
    return void 0;
  }
  const errorDescription = typeof record.error_description === "string" ? record.error_description : typeof record.errorDescription === "string" ? record.errorDescription : void 0;
  return {
    error: record.error,
    ...errorDescription ? { errorDescription } : {}
  };
}
function unwrapResponseData(body) {
  if (typeof body === "object" && body !== null && "data" in body) {
    return body.data;
  }
  return body;
}
function publicOAuthError(error, phase) {
  switch (error.errorCode) {
    case "access_denied":
      return authError("Authorization was denied.");
    case "expired_token":
      return authError("Authorization expired; run `clink wallet init` again.");
    case "invalid_grant":
      return authError(phase === "refresh" ? "OAuth session is invalid or revoked; run `clink wallet init` again." : "Authorization code is invalid or already used; run `clink wallet init` again.");
    case "invalid_client":
      return authError("OAuth client configuration was rejected.", error.status);
    case "invalid_scope":
      return configError("OAuth scope configuration was rejected by the server.");
    case "invalid_request":
      return apiError(error.message, error.status);
    default:
      return apiError(error.message, error.status);
  }
}
async function sleepUntilNextPoll(intervalSeconds, deadline, pause) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw authError("Authorization expired; run `clink wallet init` again.");
  }
  await pause(Math.min(intervalSeconds * 1e3, remaining));
}
async function assertWalletInitIsCurrent(isCurrent) {
  if (isCurrent && !await isCurrent()) {
    throw authError(WALLET_INIT_SUPERSEDED_MESSAGE, 409);
  }
}
function requiredString2(value, message) {
  if (typeof value !== "string" || value.length === 0) {
    throw apiError(message);
  }
  return value;
}
function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function parseVisaRegistrationStatus2(value, required) {
  const normalized = optionalString(value)?.toUpperCase();
  if (!normalized) {
    if (required) {
      throw apiError("OAuth response is missing visa_registration_status");
    }
    return void 0;
  }
  if (normalized !== "PENDING" && normalized !== "REGISTERING" && normalized !== "SUCCEEDED" && normalized !== "FAILED" && normalized !== "UNKNOWN") {
    throw apiError("OAuth response has invalid visa_registration_status");
  }
  return normalized;
}
function positiveNumber(value, message) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw apiError(message);
  }
  return number;
}
function nonNegativeNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : void 0;
}
function isDryRun2(value) {
  return "dryRun" in value;
}
function sleep2(ms) {
  return new Promise((resolve4) => setTimeout(resolve4, ms));
}
function mergeOAuthLoginConfig(current, options2) {
  if (options2.authorization.customerId !== options2.customerId) {
    throw configError("OAuth token customer does not match the wallet login response");
  }
  const next = cloneStoredConfig(current);
  next.baseUrl = options2.baseUrl;
  next.email = options2.email;
  next.name = options2.name;
  next.customerId = options2.customerId;
  next.authorization = { ...options2.authorization };
  next.oauthRequired = true;
  delete next.customerApiKey;
  delete next.paymentMethods;
  delete next.riskRules;
  return next;
}

// dist/output.js
function printSuccess(data, format) {
  const envelope = {
    ok: true,
    data
  };
  process.stdout.write(serialize(envelope, format));
}
function printJson(value, format) {
  process.stdout.write(serialize(value, format));
}
function printError(error, options2) {
  const cliError = error instanceof CliError ? error : new CliError("api_error", error.message, 1);
  const message = renderCliCommandText(cliError.message, options2.executableName ?? MAIN_EXECUTABLE_NAME);
  if (!options2.explicitFormat) {
    process.stderr.write(renderHumanError(message, options2.helpHint));
    return cliError.exitCode;
  }
  const envelope = {
    ok: false,
    error: {
      type: cliError.type,
      code: cliError.code,
      message,
      ...cliError.details ? { details: cliError.details } : {}
    }
  };
  process.stderr.write(serialize(envelope, options2.format));
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
function renderHumanError(message, helpHint) {
  const lines = [`Error: ${message}`];
  if (helpHint) {
    lines.push(`Hint: ${helpHint}`);
  }
  return `${lines.join("\n")}
`;
}

// dist/payment/amount.js
function parseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw validationError("amount must be a positive number");
  }
  return amount;
}

// dist/payment/authorization-api.js
var INSTRUCTION_PATH = "/agent/cwallet/instructions";
function createTipAuthorizationApi(input, overrides = {}) {
  const dependencies = {
    requestJson: overrides.requestJson ?? requestJson,
    updateStoredConfig: overrides.updateStoredConfig ?? updateStoredConfig,
    collectWebhookEvents: overrides.collectWebhookEvents ?? collectWebhookEvents,
    ackWebhookEvents: overrides.ackWebhookEvents ?? ackWebhookEvents
  };
  const getRuntimeConfig = input.getRuntimeConfig ?? (() => input.runtimeConfig);
  const resolveStoredRuntimeConfig = input.resolveStoredRuntimeConfig ?? storedRuntimeConfig;
  const requestRuntime = {
    getRuntimeConfig,
    ...input.getRuntimeConfig ? { reloadRuntimeConfig: input.getRuntimeConfig } : {},
    ...input.refreshRuntimeConfig ? { refreshRuntimeConfig: input.refreshRuntimeConfig } : {}
  };
  const refreshPaymentMethods = async () => {
    let requestedIdentity = { type: "none" };
    const binding = await requestJsonWithOAuthRetry(requestRuntime, (runtimeConfig) => {
      requestedIdentity = runtimeAuthorizationIdentity(runtimeConfig);
      return {
        baseUrl: runtimeConfig.baseUrl,
        method: "POST",
        path: "/agent/cwallet/card/bindingLink",
        headers: buildCustomerHeaders(runtimeConfig),
        body: {
          customerId: runtimeConfig.customerId,
          hasCustomerApiKey: !runtimeConfig.authorization && Boolean(runtimeConfig.customerApiKey)
        },
        timeoutMs: input.timeoutMs,
        dryRun: false
      };
    }, dependencies.requestJson);
    const data = unwrapResponse(binding, "invalid card binding response");
    const paymentMethods = normalizePaymentMethods(data.paymentMethodsVoList);
    const storedPaymentMethods = paymentMethods.map((method) => ({ ...method }));
    const nextConfig = await dependencies.updateStoredConfig((current) => {
      const currentIdentity = runtimeAuthorizationIdentity(resolveStoredRuntimeConfig(current));
      if (requestedIdentity.type === "none" || !storedConfigCanCacheForIdentity(current, requestedIdentity) || !authorizationIdentityCanContinue(requestedIdentity, currentIdentity)) {
        throw authError("Authentication changed while payment methods were refreshing; retry the command.");
      }
      current.paymentMethods = storedPaymentMethods.map((method) => ({ ...method }));
      return current;
    });
    input.storedConfig.paymentMethods = storedPaymentMethods.map((method) => ({ ...method }));
    input.setStoredConfig?.(nextConfig);
    return paymentMethods;
  };
  return {
    refreshPaymentMethods,
    refreshDefaultPaymentMethod: async () => pickDefaultPaymentMethod(await refreshPaymentMethods()),
    listInstructions: async (paymentInstrumentId) => {
      const result = await requestJsonWithOAuthRetry(requestRuntime, (runtimeConfig) => ({
        baseUrl: runtimeConfig.baseUrl,
        method: "GET",
        path: INSTRUCTION_PATH,
        headers: buildInstructionHeaders(runtimeConfig),
        query: { status: "ACTIVE", paymentInstrumentId },
        timeoutMs: input.timeoutMs,
        dryRun: false
      }), dependencies.requestJson);
      return unwrapResponse(result, "invalid instruction list response");
    },
    createInstruction: async (draft) => {
      const result = await requestJsonWithOAuthRetry(requestRuntime, (runtimeConfig2) => ({
        baseUrl: runtimeConfig2.baseUrl,
        method: "POST",
        path: INSTRUCTION_PATH,
        headers: buildInstructionHeaders(runtimeConfig2),
        body: draft,
        timeoutMs: input.timeoutMs,
        dryRun: false
      }), dependencies.requestJson);
      const data = unwrapResponse(result, "invalid instruction create response");
      const instructionId = optionalString2(data.instructionId) ?? optionalString2(data.purchaseInstructionId);
      if (!instructionId) {
        throw apiError("missing instructionId in instruction create response", 502);
      }
      const runtimeConfig = await getRuntimeConfig();
      return {
        instructionId,
        passkeyUrl: buildAgentPasskeyUrl(resolveAgentBaseUrl(runtimeConfig.baseUrl), draft.paymentInstrumentId, instructionId, runtimeConfig.email)
      };
    },
    waitForActivation: async (instructionId) => {
      const collected = await dependencies.collectWebhookEvents({
        runtimeConfig: await getRuntimeConfig(),
        getRuntimeConfig,
        resolveStoredRuntimeConfig,
        ...input.refreshRuntimeConfig ? { refreshRuntimeConfig: input.refreshRuntimeConfig } : {},
        timeoutMs: input.timeoutMs,
        type: "purchase_instruction.activated",
        ack: false
      });
      const matches = collected.events.filter((event) => eventMatchesInstruction(event, instructionId));
      if (matches.length === 0) {
        return { activated: false };
      }
      const eventIds = matches.map((event) => event.eventId).filter(Boolean);
      const ackRuntimeConfig = await getRuntimeConfig();
      await dependencies.ackWebhookEvents({
        runtimeConfig: ackRuntimeConfig,
        getRuntimeConfig,
        expectedIdentity: runtimeAuthorizationIdentity(ackRuntimeConfig),
        ...input.refreshRuntimeConfig ? { refreshRuntimeConfig: input.refreshRuntimeConfig } : {},
        timeoutMs: input.timeoutMs
      }, eventIds);
      return { activated: true };
    },
    getInstruction: async (instructionId) => {
      const result = await requestJsonWithOAuthRetry(requestRuntime, (runtimeConfig) => ({
        baseUrl: runtimeConfig.baseUrl,
        method: "GET",
        path: `${INSTRUCTION_PATH}/${encodeURIComponent(instructionId)}`,
        headers: buildInstructionHeaders(runtimeConfig),
        timeoutMs: input.timeoutMs,
        dryRun: false
      }), dependencies.requestJson);
      return unwrapResponse(result, "invalid instruction response");
    },
    now: input.now,
    watch: input.watch,
    onPasskeyUrl: input.onPasskeyUrl
  };
}
function unwrapResponse(result, invalidMessage) {
  if ("dryRun" in result) {
    throw apiError(invalidMessage, 502);
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  if (!isRecord5(data)) {
    throw apiError(invalidMessage, 502);
  }
  return data;
}
function normalizePaymentMethods(value) {
  if (!Array.isArray(value)) {
    throw apiError("invalid card binding response: missing or invalid paymentMethodsVoList", 502);
  }
  if (!value.every((item) => isRecord5(item) && typeof item.paymentInstrumentId === "string" && item.paymentInstrumentId.trim().length > 0)) {
    throw apiError("invalid card binding response: missing or invalid paymentMethodsVoList", 502);
  }
  return value.map((item) => ({ ...item }));
}
function optionalString2(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/payment/post-payment-refresh.js
var PAYMENT_METHODS_REFRESH_WARNING_PREFIX = "Failed to refresh Credit balance and payment methods after payment";
async function executePaymentRequestWithRefresh(input) {
  if (input.dryRun) {
    return { result: await input.request() };
  }
  let result;
  try {
    result = await input.request();
  } catch (error) {
    await refreshPaymentMethodsBestEffort(input.refreshPaymentMethods);
    throw error;
  }
  const paymentMethodsRefreshWarning = await refreshPaymentMethodsBestEffort(input.refreshPaymentMethods);
  return {
    result,
    ...paymentMethodsRefreshWarning ? { paymentMethodsRefreshWarning } : {}
  };
}
function addPaymentMethodsRefreshWarning(data, paymentMethodsRefreshWarning) {
  return paymentMethodsRefreshWarning ? { ...data, paymentMethodsRefreshWarning } : data;
}
async function refreshPaymentMethodsBestEffort(refreshPaymentMethods) {
  try {
    await refreshPaymentMethods();
    return void 0;
  } catch (error) {
    return `${PAYMENT_METHODS_REFRESH_WARNING_PREFIX}: ${errorMessage(error)}`;
  }
}
function errorMessage(error) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return String(error);
}

// dist/payment/charge.js
function buildChargeBody(input) {
  const authorization = input.authorization;
  const aiAgentInstructionBo = compact({
    instructionId: authorization?.instructionId,
    mandateId: authorization?.mandateId,
    shippingAddressJson: input.shippingAddress === void 0 ? void 0 : JSON.stringify(input.shippingAddress),
    merchantInfo: { merchantCategoryCode: "5999" },
    products: input.products
  });
  const shared = compact({
    paymentInstrumentId: input.paymentInstrumentId,
    paymentMethodType: input.paymentMethodType,
    instruction_id: authorization?.instructionId,
    mandate_id: authorization?.mandateId,
    shippingaddress: input.shippingAddress,
    aiAgentInstructionBo,
    purchaseInstructionId: authorization?.legacyInstructionId
  });
  return input.mode === "session" ? { ...shared, sessionId: input.sessionId } : {
    ...shared,
    merchantId: input.merchantId,
    ...input.customerPointsAmount === void 0 ? {} : { customerPointsAmount: input.customerPointsAmount },
    customAmount: input.amount,
    paymentCurrency: input.currency
  };
}
function classifyChargeData(data) {
  const channel = isRecord6(data.channelPaymentResponse) ? data.channelPaymentResponse : {};
  const action = isRecord6(channel.action) ? channel.action : {};
  const walletAction = isRecord6(action.walletHandleRedirectOrDisplayQrCode) ? action.walletHandleRedirectOrDisplayQrCode : {};
  const redirectUrl = typeof action.redirectUrl === "string" && action.redirectUrl.length > 0 ? action.redirectUrl : void 0;
  const status = finiteNumber2(channel.status);
  const imageUrlPng = typeof walletAction.imageUrlPng === "string" && walletAction.imageUrlPng.length > 0 ? walletAction.imageUrlPng : void 0;
  const qrCodeContent = typeof walletAction.qrCodeContent === "string" && walletAction.qrCodeContent.trim().length > 0 ? walletAction.qrCodeContent : void 0;
  const qrCode = status === 5 && imageUrlPng ? {
    dataUrl: imageUrlPng,
    ...qrCodeContent ? { content: qrCodeContent } : {},
    orderId: nonEmptyString2(data.orderId),
    paymentExecutionDetailId: nonEmptyString2(channel.paymentExecutionDetailId) ?? nonEmptyString2(isRecord6(channel.processingDetail) ? channel.processingDetail.paymentExecutionDetailId : void 0),
    expiresAt: nonNegativeInteger(walletAction.expiresAt),
    expiresSecond: nonNegativeInteger(walletAction.expiresSecond)
  } : void 0;
  return {
    status,
    requires3ds: Number(channel.flag3DS ?? 0) === 1 && redirectUrl !== void 0,
    ...redirectUrl ? { redirectUrl } : {},
    ...qrCode ? { qrCode } : {}
  };
}
async function executeCharge(input, runtime) {
  const refreshed = await executePaymentRequestWithRefresh({
    request: () => requestJsonWithOAuthRetry({
      getRuntimeConfig: runtime.getRuntimeConfig ?? (() => runtime.runtimeConfig),
      ...runtime.getRuntimeConfig ? { reloadRuntimeConfig: runtime.getRuntimeConfig } : {},
      ...runtime.refreshRuntimeConfig ? { refreshRuntimeConfig: runtime.refreshRuntimeConfig } : {}
    }, (runtimeConfig) => ({
      baseUrl: runtimeConfig.baseUrl,
      method: "POST",
      path: "/agent/order/charge",
      headers: buildCustomerHeaders(runtimeConfig),
      body: buildChargeBody(input),
      timeoutMs: runtime.timeoutMs,
      dryRun: runtime.dryRun
    })),
    refreshPaymentMethods: runtime.refreshPaymentMethods,
    dryRun: runtime.dryRun
  });
  const result = refreshed.result;
  if ("dryRun" in result) {
    return { dryRun: true, request: result };
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  return {
    dryRun: false,
    data,
    ...classifyChargeData(data),
    ...refreshed.paymentMethodsRefreshWarning ? { paymentMethodsRefreshWarning: refreshed.paymentMethodsRefreshWarning } : {}
  };
}
function isRecord6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber2(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : void 0;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return void 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function nonNegativeInteger(value) {
  const parsed = finiteNumber2(value);
  return parsed !== void 0 && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
function nonEmptyString2(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}
function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== void 0));
}

// dist/payment/method-selection.js
var LEGACY_DEFAULT_PAYMENT_METHOD_TYPES = /* @__PURE__ */ new Set(["CARD", "BALANCE"]);
var OPTIONAL_PAYMENT_INSTRUMENT_TYPES = /* @__PURE__ */ new Set(["ALIPAY"]);
function requiresTypeMatchedPaymentInstrument(paymentMethodType) {
  return !LEGACY_DEFAULT_PAYMENT_METHOD_TYPES.has(normalizePaymentMethodType(paymentMethodType));
}
function allowsMissingPaymentInstrument(paymentMethodType) {
  return OPTIONAL_PAYMENT_INSTRUMENT_TYPES.has(normalizePaymentMethodType(paymentMethodType));
}
function selectPaymentInstrumentByType(paymentMethods, paymentMethodType) {
  const normalizedType = normalizePaymentMethodType(paymentMethodType);
  const candidates = /* @__PURE__ */ new Map();
  if (Array.isArray(paymentMethods)) {
    for (const item of paymentMethods) {
      if (!isRecord7(item) || paymentMethodTypeOf(item) !== normalizedType) {
        continue;
      }
      const paymentInstrumentId = nonEmptyString3(item.paymentInstrumentId);
      if (!paymentInstrumentId) {
        continue;
      }
      const existing = candidates.get(paymentInstrumentId);
      candidates.set(paymentInstrumentId, {
        paymentInstrumentId,
        isDefault: Boolean(existing?.isDefault || isDefaultPaymentMethod(item))
      });
    }
  }
  const matches = [...candidates.values()];
  if (matches.length === 0) {
    throw validationError(`no ${normalizedType} payment method is available; bind one and refresh payment methods`);
  }
  if (matches.length === 1) {
    return matches[0].paymentInstrumentId;
  }
  const defaultMatches = matches.filter((candidate) => candidate.isDefault);
  if (defaultMatches.length === 1) {
    return defaultMatches[0].paymentInstrumentId;
  }
  throw validationError(`multiple ${normalizedType} payment methods are available without one unique default; pass --payment-instrument-id explicitly`);
}
function validatePaymentInstrumentType(paymentMethods, paymentInstrumentId, paymentMethodType) {
  const normalizedId = nonEmptyString3(paymentInstrumentId);
  const normalizedType = normalizePaymentMethodType(paymentMethodType);
  if (!normalizedId) {
    throw validationError("--payment-instrument-id must not be blank");
  }
  const matchingIdRecords = Array.isArray(paymentMethods) ? paymentMethods.filter((item) => isRecord7(item) && nonEmptyString3(item.paymentInstrumentId) === normalizedId) : [];
  if (matchingIdRecords.length === 0) {
    throw validationError(`payment instrument ${normalizedId} was not found after refreshing payment methods`);
  }
  if (matchingIdRecords.some((item) => paymentMethodTypeOf(item) === normalizedType)) {
    return normalizedId;
  }
  const actualTypes = [...new Set(matchingIdRecords.map((item) => paymentMethodTypeOf(item) ?? "UNKNOWN"))].join(", ");
  throw validationError(`payment instrument ${normalizedId} has type ${actualTypes}, not ${normalizedType}`);
}
function normalizePaymentMethodType(value) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    throw validationError("--payment-method-type must not be blank");
  }
  return normalized;
}
function normalizeOptionalType(value) {
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : void 0;
}
function paymentMethodTypeOf(item) {
  return normalizeOptionalType(item.paymentMethodType) ?? normalizeOptionalType(item.paymentInstrumentType);
}
function isDefaultPaymentMethod(item) {
  return item.isDefault === true || item.default === true || item.defaultPaymentMethod === true;
}
function nonEmptyString3(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function isRecord7(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/payment/qr-code.js
var import_qrcode = __toESM(require_lib(), 1);
import { chmod as chmod2, mkdtemp, rm as rm2, writeFile as writeFile2 } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
var PNG_DATA_URL_PREFIX = "data:image/png;base64,";
var MAX_QR_PNG_BYTES = 1024 * 1024;
var MAX_QR_PNG_DATA_URL_LENGTH = PNG_DATA_URL_PREFIX.length + Math.ceil(MAX_QR_PNG_BYTES / 3) * 4;
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
var REDACTED_PNG_DATA_URL = "[redacted:png-data-url]";
var REDACTED_QR_CODE_CONTENT = "[redacted:qr-code-content]";
var TERMINAL_QR_WARNING = "Warning: terminal QR could not be displayed; use customerAction.imagePath instead.\n";
async function materializeQrCodeCustomerAction(qrCode, options2 = {}) {
  const png = decodePngDataUrl(qrCode.dataUrl);
  let directoryPath;
  try {
    directoryPath = await mkdtemp(join(options2.temporaryDirectory ?? tmpdir(), "clink-cli-payment-qr-"));
    if (process.platform !== "win32") {
      await chmod2(directoryPath, 448);
    }
    const imagePath = join(directoryPath, "payment-qr.png");
    await writeFile2(imagePath, png, { flag: "wx", mode: 384 });
    if (process.platform !== "win32") {
      await chmod2(imagePath, 384);
    }
    return {
      type: "QR_CODE_REQUIRED",
      mediaType: "image/png",
      imagePath,
      temporary: true,
      cleanupRequired: true,
      cleanupPath: directoryPath,
      orderId: qrCode.orderId,
      paymentExecutionDetailId: qrCode.paymentExecutionDetailId,
      expiresAt: qrCode.expiresAt,
      expiresSecond: qrCode.expiresSecond
    };
  } catch {
    if (directoryPath) {
      await rm2(directoryPath, { recursive: true, force: true }).catch(() => {
      });
    }
    throw apiError("failed to store payment QR code", 500);
  }
}
function buildQrCodePaymentOutput(data, customerAction) {
  const redacted = redactPaymentQrSecrets(data);
  if (!isRecord8(redacted)) {
    throw apiError("invalid payment response", 502);
  }
  return {
    ...redacted,
    customerAction
  };
}
async function writeTerminalQrCode(content) {
  if (!content) {
    process.stderr.write(TERMINAL_QR_WARNING);
    return;
  }
  try {
    const rendered = await import_qrcode.default.toString(content, {
      type: "utf8",
      small: true,
      margin: 2
    });
    process.stderr.write(`
${rendered}${rendered.endsWith("\n") ? "" : "\n"}`);
  } catch {
    process.stderr.write(TERMINAL_QR_WARNING);
  }
}
function redactPaymentQrSecrets(value) {
  if (typeof value === "string") {
    return looksLikePngDataUrl(value) ? REDACTED_PNG_DATA_URL : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactPaymentQrSecrets(item));
  }
  if (!isRecord8(value)) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    key.toLowerCase() === "qrcodecontent" ? REDACTED_QR_CODE_CONTENT : redactPaymentQrSecrets(item)
  ]));
}
function decodePngDataUrl(dataUrl) {
  if (dataUrl.length > MAX_QR_PNG_DATA_URL_LENGTH || !dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    throw invalidQrCode();
  }
  const encoded = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  if (encoded.length === 0 || encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)) {
    throw invalidQrCode();
  }
  const png = Buffer.from(encoded, "base64");
  if (png.length === 0 || png.length > MAX_QR_PNG_BYTES || png.toString("base64") !== encoded) {
    throw invalidQrCode();
  }
  validatePngStructure(png);
  return png;
}
function validatePngStructure(png) {
  if (png.length < 33 || !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw invalidQrCode();
  }
  let offset = PNG_SIGNATURE.length;
  let firstChunk = true;
  let foundEnd = false;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const typeOffset = offset + 4;
    const dataOffset = typeOffset + 4;
    const chunkEnd = dataOffset + length + 4;
    if (length > MAX_QR_PNG_BYTES || chunkEnd > png.length) {
      throw invalidQrCode();
    }
    const type = png.toString("ascii", typeOffset, dataOffset);
    if (!/^[A-Za-z]{4}$/u.test(type)) {
      throw invalidQrCode();
    }
    if (firstChunk) {
      if (type !== "IHDR" || length !== 13) {
        throw invalidQrCode();
      }
      const width = png.readUInt32BE(dataOffset);
      const height = png.readUInt32BE(dataOffset + 4);
      if (width === 0 || height === 0 || width > 4096 || height > 4096) {
        throw invalidQrCode();
      }
      firstChunk = false;
    }
    if (type === "IEND") {
      if (length !== 0 || chunkEnd !== png.length) {
        throw invalidQrCode();
      }
      foundEnd = true;
      break;
    }
    offset = chunkEnd;
  }
  if (!foundEnd) {
    throw invalidQrCode();
  }
}
function looksLikePngDataUrl(value) {
  return value.trimStart().toLowerCase().startsWith("data:image/png");
}
function invalidQrCode() {
  return apiError("payment response contained an invalid PNG QR code", 502);
}
function isRecord8(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/skills/install.js
import { randomUUID as createRandomUUID } from "node:crypto";
import { mkdir as mkdir5, rm as rm7 } from "node:fs/promises";
import { join as join5 } from "node:path";

// dist/skills/agents.js
import { constants } from "node:fs";
import { cp, copyFile, lstat, mkdir as mkdir2, open as open2, readdir, readlink, realpath, rename as rename2, rm as rm3, rmdir, symlink } from "node:fs/promises";
import { dirname, isAbsolute, join as join2, relative, resolve } from "node:path";
var MARKER_FILE_NAME = ".clink-install.json";
var DETECTION_FAILURE = "failed to detect installed agents";
var PREPARE_FAILURE = "failed to prepare agent installation";
var TARGET_CONFLICT = "agent target conflicts with existing content";
var TARGET_CHANGED = "agent target changed after preflight";
var APPLY_FAILURE = "failed to apply agent installation";
var ROLLBACK_FAILURE = "failed to roll back agent installation";
var UNSUPPORTED_REASON = "no supported local skill directory";
async function detectAgents(input) {
  const homeDir = resolve(input.homeDir);
  const skillsRoot = resolve(input.skillsRoot);
  const sharedTarget = join2(skillsRoot, input.skillName);
  const detected = [];
  try {
    await appendDetected(detected, "cursor", "link", join2(homeDir, ".cursor"), (rootPath) => join2(rootPath, "skills", input.skillName));
    await appendDetected(detected, "claude-code", "link", join2(homeDir, ".claude"), (rootPath) => join2(rootPath, "skills", input.skillName));
    const codexRoot = resolveEnvironmentRoot(input.env.CODEX_HOME, join2(homeDir, ".codex"));
    await appendDetected(detected, "codex", "link", codexRoot, (rootPath) => join2(rootPath, "skills", input.skillName));
    await appendDetected(detected, "codebuddy", "link", join2(homeDir, ".codebuddy"), (rootPath) => join2(rootPath, "skills", input.skillName));
    await appendDetected(detected, "openclaw", "shared", join2(homeDir, ".openclaw"), () => sharedTarget);
    const hermesRoot = resolveEnvironmentRoot(input.env.HERMES_HOME, join2(homeDir, ".hermes"));
    await appendDetected(detected, "hermes", "copy", hermesRoot, (rootPath) => join2(rootPath, "skills", input.skillName));
    await appendDetected(detected, "trae", "link", join2(homeDir, ".trae"), (rootPath) => join2(rootPath, "skills", input.skillName));
    const opencodeRoot = await firstExistingRoot(uniquePaths([
      resolveOptionalEnvironmentRoot(input.env.OPENCODE_CONFIG_DIR),
      join2(resolveEnvironmentRoot(input.env.XDG_CONFIG_HOME, join2(homeDir, ".config")), "opencode"),
      join2(homeDir, ".opencode")
    ]));
    if (opencodeRoot !== null) {
      detected.push({
        agent: "opencode",
        mode: "shared",
        rootPath: opencodeRoot,
        targetPath: sharedTarget
      });
    }
    const copilotCliRoot = resolveEnvironmentRoot(input.env.COPILOT_HOME, join2(homeDir, ".copilot"));
    const copilotRoot = await firstExistingRoot(uniquePaths([
      copilotCliRoot,
      join2(homeDir, ".config", "github-copilot")
    ]));
    if (copilotRoot !== null) {
      detected.push({
        agent: "github-copilot",
        mode: "shared",
        rootPath: copilotRoot,
        targetPath: sharedTarget
      });
    }
    const geminiHome = resolveEnvironmentRoot(input.env.GEMINI_CLI_HOME, homeDir);
    const geminiRoot = join2(geminiHome, ".gemini");
    if (await isExistingRoot(geminiRoot)) {
      const usesSharedHome = geminiHome === homeDir;
      detected.push({
        agent: "gemini-cli",
        mode: usesSharedHome ? "shared" : "link",
        rootPath: geminiRoot,
        targetPath: usesSharedHome ? sharedTarget : join2(geminiRoot, "skills", input.skillName)
      });
    }
    await appendDetected(detected, "codework", "unsupported", join2(homeDir, ".codework"), () => null);
    await appendDetected(detected, "chatgpt", "unsupported", join2(homeDir, ".chatgpt"), () => null);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw installError(DETECTION_FAILURE);
  }
  return detected;
}
async function prepareAgentPlans(input) {
  try {
    const preflighted = [];
    for (const detected of input.detected) {
      if (detected.mode === "shared" || detected.mode === "unsupported") {
        preflighted.push({ mode: detected.mode, detected });
        continue;
      }
      if (detected.targetPath === null) {
        throw installError(PREPARE_FAILURE);
      }
      const writeDetected = detected;
      const boundary = await inspectWritableBoundary(writeDetected);
      const snapshot = await inspectTarget(writeDetected, input);
      if (snapshot.kind === "conflict" && !input.force) {
        throw installError(TARGET_CONFLICT);
      }
      const needsBackup = snapshot.kind !== "absent" && snapshot.kind !== "exact-link";
      const copyTempPath = detected.mode === "copy" ? `${writeDetected.targetPath}.clink-${input.uuid}-${detected.agent}.copy` : null;
      if (copyTempPath !== null && await pathEntryExists(copyTempPath)) {
        throw installError(PREPARE_FAILURE);
      }
      const backupPath = needsBackup ? join2(input.backupsRoot, `${input.uuid}-${detected.agent}`) : null;
      if (backupPath !== null && await pathEntryExists(backupPath)) {
        throw installError(PREPARE_FAILURE);
      }
      preflighted.push({
        mode: "write",
        value: {
          detected: writeDetected,
          snapshot,
          boundary,
          copyTempPath,
          backupPath,
          keepBackup: snapshot.kind === "conflict"
        }
      });
    }
    return preflighted.map((entry) => {
      if (entry.mode === "write") {
        return createWritePlan(entry.value, input);
      }
      if (entry.mode === "shared") {
        return createNoWritePlan(entry.detected, "shared");
      }
      return createNoWritePlan(entry.detected, "unsupported");
    });
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw installError(PREPARE_FAILURE);
  }
}
async function appendDetected(output, agent, mode, rootPath, targetPath) {
  if (!await isExistingRoot(rootPath)) {
    return;
  }
  output.push({ agent, mode, rootPath, targetPath: targetPath(rootPath) });
}
function resolveEnvironmentRoot(value, fallback) {
  return value === void 0 || value.length === 0 ? resolve(fallback) : resolve(value);
}
function resolveOptionalEnvironmentRoot(value) {
  return value === void 0 || value.length === 0 ? null : resolve(value);
}
function uniquePaths(paths) {
  return [...new Set(paths.filter((value) => value !== null))];
}
async function firstExistingRoot(paths) {
  for (const rootPath of paths) {
    if (await isExistingRoot(rootPath)) {
      return rootPath;
    }
  }
  return null;
}
async function isExistingRoot(rootPath) {
  const rootStat = await lstatIfExists(rootPath);
  return rootStat !== null && (rootStat.isDirectory() || rootStat.isSymbolicLink());
}
function createNoWritePlan(detected, mode) {
  return {
    async apply() {
      if (mode === "shared") {
        return {
          agent: detected.agent,
          status: "shared",
          path: detected.targetPath
        };
      }
      return {
        agent: detected.agent,
        status: "unsupported",
        path: null,
        reason: UNSUPPORTED_REASON
      };
    },
    async rollback() {
    },
    async finalize() {
    }
  };
}
function createWritePlan(preflight, input) {
  const { detected, snapshot, boundary, copyTempPath, backupPath, keepBackup } = preflight;
  const targetPath = detected.targetPath;
  const backupObjectPath = backupPath === null ? null : join2(backupPath, "target");
  let appliedResult = null;
  let backupMoved = false;
  let backupVerified = false;
  let backupContainerEntry = null;
  let movedBackupFingerprint = null;
  let preserveBackup = keepBackup;
  let placedFingerprint = null;
  let copyTempFingerprint = null;
  let parentCreated = false;
  let ownedParent = null;
  let finalized = false;
  let committed = false;
  async function applyLink() {
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetUnchanged(detected, input, snapshot);
    if (snapshot.kind === "exact-link") {
      return { agent: detected.agent, status: "unchanged", path: targetPath };
    }
    await ensureTargetParent();
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetUnchanged(detected, input, snapshot);
    await moveExistingTarget();
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetAbsent(targetPath);
    const linkText = relative(dirname(targetPath), input.currentPath);
    await symlink(linkText, targetPath, "dir");
    placedFingerprint = await fingerprintPath(targetPath, detected.mode);
    const installedSnapshot = await inspectTarget(detected, input);
    if (installedSnapshot.kind !== "exact-link") {
      throw new Error("link verification failed");
    }
    const installedLink = await readlink(targetPath);
    if (installedLink !== linkText) {
      throw new Error("link verification failed");
    }
    return { agent: detected.agent, status: "linked", path: targetPath };
  }
  async function applyCopy(releasePath, marker) {
    if (!isMarker(marker) || marker.publisher !== input.publisher || marker.skillName !== input.skillName) {
      throw new Error("invalid copy marker");
    }
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetUnchanged(detected, input, snapshot);
    if (snapshot.kind === "managed-copy" && markersMatchIdentityAndSha(snapshot.marker, marker)) {
      return { agent: detected.agent, status: "unchanged", path: targetPath };
    }
    await ensureTargetParent();
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetUnchanged(detected, input, snapshot);
    await moveExistingTarget();
    if (copyTempPath === null) {
      throw new Error("missing copy staging path");
    }
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetAbsent(targetPath);
    await assertAuxiliaryAbsent(copyTempPath);
    await copyDirectoryExclusively(releasePath, copyTempPath);
    copyTempFingerprint = await fingerprintPath(copyTempPath, detected.mode);
    const stagedMarker = await readMarkerRecord(copyTempPath);
    if (stagedMarker === null || !markersMatchIdentityAndSha(stagedMarker.marker, marker)) {
      throw new Error("copy verification failed");
    }
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetAbsent(targetPath);
    await rename2(copyTempPath, targetPath);
    placedFingerprint = copyTempFingerprint;
    copyTempFingerprint = null;
    await allowPendingFilesystemEvents();
    await assertPathNamesEntry(targetPath, entryIdentityFromFingerprint(placedFingerprint));
    const copiedFingerprint = await fingerprintPath(targetPath, detected.mode);
    if (!sameMovedObject(placedFingerprint, copiedFingerprint)) {
      throw new Error("copy placement verification failed");
    }
    placedFingerprint = copiedFingerprint;
    const installedSnapshot = await inspectTarget(detected, input);
    if (installedSnapshot.kind !== "managed-copy" || !markersMatchIdentityAndSha(installedSnapshot.marker, marker)) {
      throw new Error("copy verification failed");
    }
    return { agent: detected.agent, status: "copied", path: targetPath };
  }
  async function ensureTargetParent() {
    await assertWritableBoundary(boundary, ownedParent);
    if (boundary.parent.kind === "existing") {
      return;
    }
    await mkdir2(boundary.parentPath);
    parentCreated = true;
    ownedParent = await inspectExistingDirectoryBoundary(boundary.parentPath, boundary.canonicalRoot, false);
    await assertWritableBoundary(boundary, ownedParent);
  }
  async function moveExistingTarget() {
    if (snapshot.kind === "absent" || snapshot.kind === "exact-link") {
      return;
    }
    if (backupPath === null || backupObjectPath === null) {
      throw new Error("missing backup path");
    }
    await mkdir2(input.backupsRoot, { recursive: true, mode: 448 });
    await mkdir2(backupPath, { mode: 448 });
    backupContainerEntry = createEntryIdentity(await lstat(backupPath));
    await assertWritableBoundary(boundary, ownedParent);
    await assertTargetUnchanged(detected, input, snapshot);
    await assertPathNamesEntry(backupPath, backupContainerEntry);
    await rename2(targetPath, backupObjectPath);
    backupMoved = true;
    await assertPathNamesEntry(backupPath, backupContainerEntry);
    movedBackupFingerprint = await fingerprintPath(backupObjectPath, detected.mode);
    if (!sameMovedObject(snapshot.fingerprint, movedBackupFingerprint)) {
      preserveBackup = true;
      throw new Error("moved target verification failed");
    }
    backupVerified = true;
  }
  async function undoMutation() {
    let removedPlacedTarget = false;
    if (copyTempPath !== null && copyTempFingerprint !== null) {
      await removeOwnedPath(copyTempPath, copyTempFingerprint, detected.mode);
      copyTempFingerprint = null;
    }
    if (placedFingerprint !== null) {
      const currentFingerprint = await fingerprintPathIfExists(targetPath, detected.mode);
      if (currentFingerprint !== null) {
        if (!sameFingerprint(currentFingerprint, placedFingerprint)) {
          throw new Error("installed target changed before rollback");
        }
        await rm3(targetPath, { recursive: true, force: true });
        removedPlacedTarget = true;
      }
      placedFingerprint = null;
    }
    if (backupMoved) {
      if (backupPath === null || backupObjectPath === null) {
        throw new Error("missing backup path");
      }
      await assertWritableBoundary(boundary, ownedParent);
      await restoreBackupExclusively(backupObjectPath, targetPath, movedBackupFingerprint, detected.mode);
      backupMoved = false;
      backupVerified = false;
      movedBackupFingerprint = null;
    }
    if (backupContainerEntry !== null && backupPath !== null) {
      await removeOwnedDirectory(backupPath, backupContainerEntry);
      backupContainerEntry = null;
    }
    if (parentCreated && removedPlacedTarget) {
      await removeOwnedParent(boundary, ownedParent);
    }
    parentCreated = false;
    ownedParent = null;
  }
  return {
    async apply({ releasePath, marker }) {
      if (appliedResult !== null) {
        return appliedResult;
      }
      if (finalized) {
        throw installError(APPLY_FAILURE);
      }
      try {
        appliedResult = detected.mode === "link" ? await applyLink() : await applyCopy(releasePath, marker);
        return appliedResult;
      } catch {
        try {
          await undoMutation();
        } catch {
        }
        throw installError(APPLY_FAILURE);
      }
    },
    async rollback() {
      if (committed) {
        return;
      }
      if (appliedResult === null && !backupMoved && placedFingerprint === null) {
        return;
      }
      try {
        await undoMutation();
        appliedResult = null;
      } catch {
        throw installError(ROLLBACK_FAILURE);
      }
    },
    async finalize() {
      if (finalized) {
        return;
      }
      finalized = true;
      committed = true;
      if (backupMoved && !preserveBackup && backupVerified && backupPath !== null && backupObjectPath !== null && movedBackupFingerprint !== null) {
        try {
          if (backupContainerEntry === null) {
            return;
          }
          await assertPathNamesEntry(backupPath, backupContainerEntry);
          const currentBackup = await fingerprintPathIfExists(backupObjectPath, detected.mode);
          if (currentBackup !== null && sameMovedObject(movedBackupFingerprint, currentBackup)) {
            await rm3(backupPath, { recursive: true, force: true });
            backupMoved = false;
            backupVerified = false;
            backupContainerEntry = null;
            movedBackupFingerprint = null;
          }
        } catch {
        }
      }
    }
  };
}
async function inspectWritableBoundary(detected) {
  const rootPath = resolve(detected.rootPath);
  const targetPath = resolve(detected.targetPath);
  if (!isPathContained(rootPath, targetPath)) {
    throw installError(TARGET_CONFLICT);
  }
  const rootStat = await lstat(rootPath);
  if (!rootStat.isDirectory() && !rootStat.isSymbolicLink()) {
    throw installError(TARGET_CONFLICT);
  }
  const canonicalRoot = await realpath(rootPath);
  const canonicalRootStat = await lstat(canonicalRoot);
  if (!canonicalRootStat.isDirectory()) {
    throw installError(TARGET_CONFLICT);
  }
  const parentPath = dirname(targetPath);
  const parentStat = await lstatIfExists(parentPath);
  const parent = parentStat === null ? { kind: "missing" } : await inspectExistingDirectoryBoundary(parentPath, canonicalRoot, true);
  return {
    rootPath,
    rootEntry: createEntryIdentity(rootStat),
    canonicalRoot,
    canonicalRootEntry: createEntryIdentity(canonicalRootStat),
    parentPath,
    parent
  };
}
async function inspectExistingDirectoryBoundary(directoryPath, canonicalRoot, allowSymlink) {
  const entryStat = await lstat(directoryPath);
  if (!entryStat.isDirectory() && !(allowSymlink && entryStat.isSymbolicLink())) {
    throw installError(TARGET_CONFLICT);
  }
  const canonicalPath = await realpath(directoryPath);
  const canonicalStat = await lstat(canonicalPath);
  if (!canonicalStat.isDirectory() || !isPathContained(canonicalRoot, canonicalPath)) {
    throw installError(TARGET_CONFLICT);
  }
  return {
    kind: "existing",
    entry: createEntryIdentity(entryStat),
    canonicalPath,
    canonicalEntry: createEntryIdentity(canonicalStat)
  };
}
async function assertWritableBoundary(boundary, ownedParent) {
  const rootStat = await lstat(boundary.rootPath);
  const canonicalRoot = await realpath(boundary.rootPath);
  const canonicalRootStat = await lstat(canonicalRoot);
  if (!sameEntryIdentity(createEntryIdentity(rootStat), boundary.rootEntry) || canonicalRoot !== boundary.canonicalRoot || !sameEntryIdentity(createEntryIdentity(canonicalRootStat), boundary.canonicalRootEntry)) {
    throw installError(TARGET_CHANGED);
  }
  const expectedParent = ownedParent ?? boundary.parent;
  if (expectedParent.kind === "missing") {
    if (await pathEntryExists(boundary.parentPath)) {
      throw installError(TARGET_CHANGED);
    }
    return;
  }
  const actualParent = await inspectExistingDirectoryBoundary(boundary.parentPath, boundary.canonicalRoot, true);
  if (!sameEntryIdentity(actualParent.entry, expectedParent.entry) || actualParent.canonicalPath !== expectedParent.canonicalPath || !sameEntryIdentity(actualParent.canonicalEntry, expectedParent.canonicalEntry)) {
    throw installError(TARGET_CHANGED);
  }
}
async function removeOwnedParent(boundary, ownedParent) {
  if (ownedParent === null) {
    return;
  }
  try {
    const actual = await inspectExistingDirectoryBoundary(boundary.parentPath, boundary.canonicalRoot, false);
    if (!sameEntryIdentity(actual.entry, ownedParent.entry) || actual.canonicalPath !== ownedParent.canonicalPath || !sameEntryIdentity(actual.canonicalEntry, ownedParent.canonicalEntry)) {
      return;
    }
    await rmdir(boundary.parentPath);
  } catch (error) {
    if (error instanceof CliError || isErrorCode(error, "ENOENT") || isErrorCode(error, "ENOTEMPTY") || isErrorCode(error, "EEXIST")) {
      return;
    }
    throw error;
  }
}
async function copyDirectoryContents(sourcePath, targetPath) {
  const sourceStat = await lstat(sourcePath);
  if (!sourceStat.isDirectory()) {
    throw new Error("copy source is not a directory");
  }
  const entries = await readdir(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    await cp(join2(sourcePath, entry.name), join2(targetPath, entry.name), {
      recursive: true,
      dereference: false,
      errorOnExist: true,
      force: false
    });
  }
}
async function copyDirectoryExclusively(sourcePath, targetPath) {
  const sourceStat = await lstat(sourcePath);
  if (!sourceStat.isDirectory()) {
    throw new Error("copy source is not a directory");
  }
  await cp(sourcePath, targetPath, {
    recursive: true,
    dereference: false,
    errorOnExist: true,
    force: false
  });
}
async function allowPendingFilesystemEvents() {
  await new Promise((resolveEvents) => setImmediate(resolveEvents));
}
async function assertPathNamesEntry(filePath, expectedEntry) {
  const stats = await lstat(filePath);
  if (!sameEntryIdentity(createEntryIdentity(stats), expectedEntry)) {
    throw installError(TARGET_CHANGED);
  }
}
async function removeOwnedDirectory(directoryPath, expectedEntry) {
  const stats = await lstatIfExists(directoryPath);
  if (stats === null || !sameEntryIdentity(createEntryIdentity(stats), expectedEntry)) {
    return;
  }
  try {
    await rmdir(directoryPath);
  } catch (error) {
    if (!isErrorCode(error, "ENOENT") && !isErrorCode(error, "ENOTEMPTY") && !isErrorCode(error, "EEXIST")) {
      throw error;
    }
  }
}
async function restoreBackupExclusively(backupPath, targetPath, expectedBackup, mode) {
  await assertTargetAbsent(targetPath);
  const backupFingerprint = await fingerprintPath(backupPath, mode);
  if (expectedBackup !== null && !sameMovedObject(expectedBackup, backupFingerprint)) {
    throw new Error("backup changed before rollback");
  }
  if (backupFingerprint.type === "symlink") {
    const linkText = await readlink(backupPath);
    await symlink(linkText, targetPath, "dir");
    await rm3(backupPath, { force: true });
    return;
  }
  if (backupFingerprint.type === "file") {
    await copyFile(backupPath, targetPath, constants.COPYFILE_EXCL);
    await rm3(backupPath, { force: true });
    return;
  }
  if (backupFingerprint.type === "directory") {
    await mkdir2(targetPath);
    const placedDirectory = createEntryIdentity(await lstat(targetPath));
    try {
      await allowPendingFilesystemEvents();
      await assertPathNamesEntry(targetPath, placedDirectory);
      await copyDirectoryContents(backupPath, targetPath);
      await assertPathNamesEntry(targetPath, placedDirectory);
      const restoredFingerprint = await fingerprintPath(targetPath, mode);
      if (!sameCopiedObject(backupFingerprint, restoredFingerprint)) {
        throw new Error("restored directory verification failed");
      }
      await rm3(backupPath, { recursive: true });
      return;
    } catch (error) {
      const currentTarget = await lstatIfExists(targetPath);
      if (currentTarget !== null && sameEntryIdentity(createEntryIdentity(currentTarget), placedDirectory)) {
        await rm3(targetPath, { recursive: true, force: true });
      }
      throw error;
    }
  }
  throw new Error("unsupported backup type");
}
async function fingerprintPath(filePath, mode) {
  const stats = await lstat(filePath);
  const linkText = stats.isSymbolicLink() ? await readlink(filePath) : null;
  const marker = mode === "copy" && stats.isDirectory() ? await readMarkerRecord(filePath) : null;
  return createFingerprint(stats, linkText, marker?.raw ?? null);
}
async function fingerprintPathIfExists(filePath, mode) {
  const stats = await lstatIfExists(filePath);
  if (stats === null) {
    return null;
  }
  const linkText = stats.isSymbolicLink() ? await readlink(filePath) : null;
  const marker = mode === "copy" && stats.isDirectory() ? await readMarkerRecord(filePath) : null;
  return createFingerprint(stats, linkText, marker?.raw ?? null);
}
async function inspectTarget(detected, input) {
  const targetStat = await lstatIfExists(detected.targetPath);
  if (targetStat === null) {
    return { kind: "absent" };
  }
  if (detected.mode === "link") {
    if (!targetStat.isSymbolicLink()) {
      return {
        kind: "conflict",
        fingerprint: createFingerprint(targetStat, null, null)
      };
    }
    const linkText = await readlink(detected.targetPath);
    const resolvedTarget = resolve(dirname(detected.targetPath), linkText);
    const fingerprint = createFingerprint(targetStat, linkText, null);
    if (resolvedTarget === resolve(input.currentPath)) {
      return { kind: "exact-link", fingerprint };
    }
    const releaseIdentity = await managedReleaseIdentity(input.currentPath, resolvedTarget);
    if (releaseIdentity?.publisher === input.publisher && releaseIdentity.skillName === input.skillName) {
      return { kind: "managed-link", fingerprint };
    }
    return { kind: "conflict", fingerprint };
  }
  if (detected.mode === "copy" && targetStat.isDirectory()) {
    const markerRecord = await readMarkerRecord(detected.targetPath);
    const fingerprint = createFingerprint(targetStat, null, markerRecord?.raw ?? null);
    if (markerRecord !== null && markerRecord.marker.publisher === input.publisher && markerRecord.marker.skillName === input.skillName) {
      return { kind: "managed-copy", fingerprint, marker: markerRecord.marker };
    }
    return { kind: "conflict", fingerprint };
  }
  return {
    kind: "conflict",
    fingerprint: createFingerprint(targetStat, null, null)
  };
}
async function managedReleaseIdentity(currentPath, resolvedTarget) {
  try {
    const releasesRoot = await realpath(join2(dirname(currentPath), ".clink", "releases"));
    const releasesStat = await lstat(releasesRoot);
    const targetStat = await lstat(resolvedTarget);
    if (!releasesStat.isDirectory() || !targetStat.isDirectory()) {
      return null;
    }
    const canonicalTarget = await realpath(resolvedTarget);
    if (!isPathContained(releasesRoot, canonicalTarget)) {
      return null;
    }
    const releasePath = relative(releasesRoot, canonicalTarget);
    if (releasePath.length === 0 || isAbsolute(releasePath)) {
      return null;
    }
    const parts = releasePath.split(/[\\/]/u);
    if (parts.length !== 3 || parts.some((part) => part.length === 0) || !/^[a-f\d]{64}$/u.test(parts[2])) {
      return null;
    }
    const marker = await readMarkerRecord(canonicalTarget);
    if (marker === null || marker.marker.publisher !== parts[0] || marker.marker.skillName !== parts[1] || marker.marker.sha256 !== parts[2]) {
      return null;
    }
    return { publisher: parts[0], skillName: parts[1] };
  } catch {
    return null;
  }
}
async function assertTargetUnchanged(detected, input, expected) {
  const actual = await inspectTarget(detected, input);
  if (!sameSnapshot(actual, expected)) {
    throw installError(TARGET_CHANGED);
  }
}
async function assertTargetAbsent(targetPath) {
  if (await pathEntryExists(targetPath)) {
    throw installError(TARGET_CHANGED);
  }
}
async function assertAuxiliaryAbsent(auxiliaryPath) {
  if (await pathEntryExists(auxiliaryPath)) {
    throw installError(PREPARE_FAILURE);
  }
}
function sameSnapshot(first, second) {
  if (first.kind !== second.kind) {
    return false;
  }
  if (first.kind === "absent" || second.kind === "absent") {
    return first.kind === second.kind;
  }
  return sameFingerprint(first.fingerprint, second.fingerprint);
}
function sameFingerprint(first, second) {
  return first.type === second.type && first.dev === second.dev && first.ino === second.ino && first.mode === second.mode && first.size === second.size && first.mtimeMs === second.mtimeMs && first.ctimeMs === second.ctimeMs && first.linkText === second.linkText && first.markerRaw === second.markerRaw;
}
function sameMovedObject(first, second) {
  return sameEntryIdentity(entryIdentityFromFingerprint(first), entryIdentityFromFingerprint(second)) && first.size === second.size && first.linkText === second.linkText && first.markerRaw === second.markerRaw;
}
function sameCopiedObject(first, second) {
  return first.type === second.type && first.mode === second.mode && first.size === second.size && first.linkText === second.linkText && first.markerRaw === second.markerRaw;
}
async function removeOwnedPath(filePath, expected, mode) {
  const actual = await fingerprintPathIfExists(filePath, mode);
  if (actual === null || !sameEntryIdentity(entryIdentityFromFingerprint(actual), entryIdentityFromFingerprint(expected))) {
    return;
  }
  await rm3(filePath, { recursive: true, force: true });
}
function createEntryIdentity(stats) {
  return {
    type: stats.isDirectory() ? "directory" : stats.isFile() ? "file" : stats.isSymbolicLink() ? "symlink" : "other",
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode
  };
}
function entryIdentityFromFingerprint(fingerprint) {
  return {
    type: fingerprint.type,
    dev: fingerprint.dev,
    ino: fingerprint.ino,
    mode: fingerprint.mode
  };
}
function sameEntryIdentity(first, second) {
  return first.type === second.type && first.dev === second.dev && first.ino === second.ino && first.mode === second.mode;
}
function isPathContained(rootPath, candidatePath) {
  const containedPath = relative(rootPath, candidatePath);
  return containedPath === "" || !isAbsolute(containedPath) && containedPath !== ".." && !containedPath.startsWith("../") && !containedPath.startsWith("..\\");
}
function createFingerprint(stats, linkText, markerRaw) {
  return {
    type: stats.isDirectory() ? "directory" : stats.isFile() ? "file" : stats.isSymbolicLink() ? "symlink" : "other",
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    ctimeMs: stats.ctimeMs,
    linkText,
    markerRaw
  };
}
async function readMarkerRecord(rootPath) {
  const markerPath = join2(rootPath, MARKER_FILE_NAME);
  let markerStat;
  try {
    markerStat = await lstatIfExists(markerPath);
  } catch {
    return null;
  }
  if (markerStat === null || !markerStat.isFile() || markerStat.isSymbolicLink()) {
    return null;
  }
  let handle;
  try {
    handle = await open2(markerPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const raw = await handle.readFile({ encoding: "utf8" });
    const parsed = JSON.parse(raw);
    return isMarker(parsed) ? { marker: parsed, raw } : null;
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}
function isMarker(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const marker = value;
  return marker.schemaVersion === 1 && typeof marker.publisher === "string" && marker.publisher.length > 0 && typeof marker.skillName === "string" && marker.skillName.length > 0 && (marker.requestedVersion === null || typeof marker.requestedVersion === "string") && typeof marker.sha256 === "string" && /^[a-f\d]{64}$/iu.test(marker.sha256) && typeof marker.sizeBytes === "number" && Number.isSafeInteger(marker.sizeBytes) && marker.sizeBytes >= 0 && typeof marker.installedAt === "string";
}
function markersMatchIdentityAndSha(first, second) {
  return first.publisher === second.publisher && first.skillName === second.skillName && first.sha256.toLowerCase() === second.sha256.toLowerCase();
}
async function lstatIfExists(filePath) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (isErrorCode(error, "ENOENT") || isErrorCode(error, "ENOTDIR")) {
      return null;
    }
    throw error;
  }
}
async function pathEntryExists(filePath) {
  return await lstatIfExists(filePath) !== null;
}
function isErrorCode(error, code) {
  return error?.code === code;
}

// dist/skills/archive.js
var import_yauzl = __toESM(require_yauzl(), 1);
import { createWriteStream } from "node:fs";
import { chmod as chmod3, lstat as lstat2, mkdir as mkdir3, open as open3, readdir as readdir2, rm as rm4, writeFile as writeFile3 } from "node:fs/promises";
import { dirname as dirname2, isAbsolute as isAbsolute2, relative as relative2, resolve as resolve2, sep } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// dist/skills/spec.js
var HUMAN_READABLE_SEGMENT_PATTERN = /^[\p{L}\p{M}\p{N}._-]+(?: +[\p{L}\p{M}\p{N}._-]+)*$/u;
var VERSION_PATTERN = /^[A-Za-z0-9._+-]+$/;
var MAX_SEGMENT_LENGTH = 128;
var PACKAGE_SPEC_SYNTAX = "<publisher>/<skillName>[@<version>]";
var TIP_FLAG_SYNTAX = "--publisher <publisher> --name <skillName>";
var FORBIDDEN_TIP_FLAGS = [
  "version",
  "payment-instrument-id",
  "instruction-id",
  "purchase-instruction-id",
  "mandate-id",
  "merchant-id",
  "session-id",
  "payment-method-type",
  "shipping-address",
  "products",
  "force"
];
function parseSkillPackageSpec(value) {
  const slashIndex = value.indexOf("/");
  if (slashIndex === -1 || slashIndex !== value.lastIndexOf("/")) {
    throw invalidPackageSpec();
  }
  const publisher = value.slice(0, slashIndex);
  const skillAndVersion = value.slice(slashIndex + 1);
  const versionSeparatorIndex = skillAndVersion.lastIndexOf("@");
  const skillName = versionSeparatorIndex === -1 ? skillAndVersion : skillAndVersion.slice(0, versionSeparatorIndex);
  const requestedVersion = versionSeparatorIndex === -1 ? null : skillAndVersion.slice(versionSeparatorIndex + 1);
  if (!isValidSkillIdentitySegment(publisher) || !isValidSkillName(skillName) || requestedVersion !== null && (requestedVersion.toLowerCase() === "latest" || !isValidSegment(requestedVersion, VERSION_PATTERN))) {
    throw invalidPackageSpec();
  }
  return { publisher, skillName, requestedVersion };
}
function parseSkillInstallArgs(operands, flags) {
  if (operands.length === 0) {
    throw validationError(`skills install requires a package: ${PACKAGE_SPEC_SYNTAX}`);
  }
  if (operands.length !== 1) {
    throw validationError(`skills install accepts exactly one package: ${PACKAGE_SPEC_SYNTAX}`);
  }
  if (flags.version !== void 0) {
    throw validationError("--version is not supported by skills install; use publisher/skillName@version");
  }
  return {
    ...parseSkillPackageSpec(operands[0]),
    force: getBooleanFlag(flags, "force")
  };
}
function parseSkillTipArgs(operands, flags) {
  if (operands.length !== 0) {
    throw validationError("skills tip does not accept positional arguments; use --publisher with --name");
  }
  for (const name of FORBIDDEN_TIP_FLAGS) {
    if (flags[name] !== void 0) {
      throw validationError(name === "payment-instrument-id" ? "skills tip always uses the refreshed default payment method" : `--${name} is not supported by skills tip`);
    }
  }
  const publisher = getStringFlag(flags, "publisher");
  const skillName = getStringFlag(flags, "name");
  const hasPublisher = flags.publisher !== void 0;
  const hasSkillName = flags.name !== void 0;
  if (!hasPublisher && !hasSkillName) {
    throw validationError("skills tip requires --publisher with --name");
  }
  if (hasPublisher !== hasSkillName) {
    throw validationError("skills tip requires both --publisher and --name");
  }
  if (publisher === void 0 || skillName === void 0 || !isValidSkillTipIdentitySegment(publisher) || !isValidSkillTipIdentitySegment(skillName)) {
    throw invalidTipIdentity();
  }
  const target = {
    publisher,
    skillName
  };
  const currency = getStringFlag(flags, "currency");
  if (currency !== void 0 && currency.toUpperCase() !== "USD") {
    throw validationError("skills tip only supports USD");
  }
  const amount = parseAmount(requireStringFlag(flags, "missing --amount", "amount"));
  if (amount < 1 || amount > 100) {
    throw validationError("skills tip amount must be between 1 and 100 USD");
  }
  return {
    target,
    amount,
    currency: "USD"
  };
}
function isValidSkillIdentitySegment(value) {
  return isValidSegment(value, HUMAN_READABLE_SEGMENT_PATTERN);
}
function isValidSkillName(value) {
  return isValidSegment(value, HUMAN_READABLE_SEGMENT_PATTERN);
}
function isValidSkillTipIdentitySegment(value) {
  return isValidSegment(value, HUMAN_READABLE_SEGMENT_PATTERN);
}
function isValidSegment(value, pattern) {
  return value.length > 0 && value.length <= MAX_SEGMENT_LENGTH && value !== "." && value !== ".." && pattern.test(value);
}
function invalidPackageSpec() {
  return validationError(`invalid skill package; expected ${PACKAGE_SPEC_SYNTAX}`);
}
function invalidTipIdentity() {
  return validationError(`invalid skill identity; expected ${TIP_FLAG_SYNTAX}`);
}

// dist/skills/archive.js
var DEFAULT_ARCHIVE_LIMITS = Object.freeze({
  maxEntries: 4096,
  maxTotalBytes: 200 * 1024 * 1024,
  maxFileBytes: 50 * 1024 * 1024,
  maxDepth: 20,
  maxCompressionRatio: 100
});
var INSTALL_ERROR_MESSAGE = "failed to extract skill archive";
var INSTALL_MARKER_NAME = ".clink-install.json";
var ZIP_SIGNATURES = /* @__PURE__ */ new Set([67324752, 101010256, 134695760]);
var UNIX_PLATFORM = 3;
var UNIX_FILE_TYPE_MASK = 61440;
var UNIX_REGULAR_FILE = 32768;
var UNIX_DIRECTORY = 16384;
function normalizeArchiveEntryPath(raw, maxDepth) {
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) {
    throw new Error("invalid archive depth limit");
  }
  if (raw.length === 0 || raw.includes("\0")) {
    throw new Error("invalid archive entry path");
  }
  const withZipSeparators = raw.replace(/\\/g, "/");
  if (withZipSeparators.startsWith("/") || /^[A-Za-z]:/.test(withZipSeparators)) {
    throw new Error("invalid archive entry path");
  }
  const withoutDirectorySlash = withZipSeparators.endsWith("/") ? withZipSeparators.slice(0, -1) : withZipSeparators;
  const segments = withoutDirectorySlash.split("/");
  if (withoutDirectorySlash.length === 0 || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..") || segments.length > maxDepth) {
    throw new Error("invalid archive entry path");
  }
  return segments.join("/");
}
async function extractSkillPackage(packagePath, destination, overrides = {}) {
  const destinationRoot = resolve2(destination);
  try {
    const limits = resolveArchiveLimits(overrides);
    const classified = await classifySkillPackage(packagePath, limits);
    if (classified.kind === "zip") {
      return await extractSkillArchive(packagePath, destinationRoot, overrides);
    }
    return await materializeRawSkill(classified.bytes, destinationRoot);
  } catch {
    try {
      await rm4(destinationRoot, { recursive: true, force: true });
    } catch {
    }
    throw installError(INSTALL_ERROR_MESSAGE);
  }
}
async function classifySkillPackage(packagePath, limits) {
  const handle = await open3(packagePath, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || !Number.isSafeInteger(metadata.size) || metadata.size < 0) {
      throw new Error("skill package is not a regular file");
    }
    const header = Buffer.alloc(4);
    const { bytesRead } = await handle.read(header, 0, header.byteLength, 0);
    if (bytesRead === 4 && ZIP_SIGNATURES.has(header.readUInt32LE(0))) {
      return { kind: "zip" };
    }
    if (metadata.size > limits.maxFileBytes || metadata.size > limits.maxTotalBytes) {
      throw new Error("raw skill size limit exceeded");
    }
    const bytes = await handle.readFile();
    if (bytes.byteLength !== metadata.size) {
      throw new Error("raw skill size changed while reading");
    }
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { kind: "raw", bytes };
  } finally {
    await handle.close();
  }
}
async function materializeRawSkill(bytes, destinationRoot) {
  await mkdir3(destinationRoot, { recursive: true, mode: 493 });
  await chmod3(destinationRoot, 493);
  const rawRoot = resolve2(destinationRoot, "raw");
  assertPathContained(destinationRoot, rawRoot);
  await mkdir3(rawRoot, { mode: 493 });
  await chmod3(rawRoot, 493);
  const skillPath = resolve2(rawRoot, "SKILL.md");
  assertPathContained(rawRoot, skillPath);
  await writeFile3(skillPath, bytes, { flag: "wx", mode: 420 });
  await chmod3(skillPath, 420);
  return {
    layout: "single",
    skillRoot: rawRoot,
    entryCount: 1,
    uncompressedBytes: bytes.byteLength
  };
}
async function extractSkillArchive(zipPath, destination, overrides = {}) {
  let zipFile;
  const destinationRoot = resolve2(destination);
  try {
    const limits = resolveArchiveLimits(overrides);
    zipFile = await (0, import_yauzl.openPromise)(zipPath, {
      autoClose: true,
      decodeStrings: true,
      strictFileNames: false,
      validateEntrySizes: true
    });
    assertSafeSize(zipFile.entryCount);
    if (zipFile.entryCount > limits.maxEntries) {
      throw new Error("archive entry limit exceeded");
    }
    await mkdir3(destinationRoot, { recursive: true, mode: 493 });
    await chmod3(destinationRoot, 493);
    const rawRoot = resolve2(destinationRoot, "raw");
    assertPathContained(destinationRoot, rawRoot);
    await mkdir3(rawRoot, { mode: 493 });
    await chmod3(rawRoot, 493);
    const registeredPaths = new ArchivePathRegistry();
    const knownDirectories = /* @__PURE__ */ new Set([destinationRoot, rawRoot]);
    const byteCount = { total: 0 };
    let declaredTotalBytes = 0;
    let entryCount = 0;
    for await (const entry of zipFile.eachEntry()) {
      entryCount += 1;
      if (entryCount > limits.maxEntries) {
        throw new Error("archive entry limit exceeded");
      }
      const normalizedPath = normalizeArchiveEntryPath(entry.fileName, limits.maxDepth);
      rejectInstallMarker(normalizedPath);
      const classified = classifyEntry(entry);
      registeredPaths.register(normalizedPath, classified.kind);
      const outputPath = resolve2(rawRoot, normalizedPath);
      assertPathContained(rawRoot, outputPath);
      validateDeclaredEntry(entry, limits);
      declaredTotalBytes = addBoundedSize(declaredTotalBytes, entry.uncompressedSize, limits.maxTotalBytes);
      if (classified.kind === "directory") {
        if (entry.uncompressedSize !== 0) {
          throw new Error("archive directory contains data");
        }
        await ensureDirectoryTree(rawRoot, outputPath, knownDirectories);
        continue;
      }
      await ensureDirectoryTree(rawRoot, dirname2(outputPath), knownDirectories);
      const source = await zipFile.openReadStreamPromise(entry);
      const meter = new ArchiveByteCounter(limits, byteCount);
      const mode = classified.executable ? 493 : 420;
      await pipeline(source, meter, createWriteStream(outputPath, { flags: "wx", mode }));
      if (meter.fileBytes !== entry.uncompressedSize) {
        throw new Error("archive entry size mismatch");
      }
      await chmod3(outputPath, mode);
    }
    if (entryCount !== zipFile.entryCount || byteCount.total !== declaredTotalBytes) {
      throw new Error("archive size metadata mismatch");
    }
    closeZip(zipFile);
    const layout = await selectSkillLayout(rawRoot);
    return {
      ...layout,
      entryCount,
      uncompressedBytes: byteCount.total
    };
  } catch {
    closeZip(zipFile);
    try {
      await rm4(destinationRoot, { recursive: true, force: true });
    } catch {
    }
    throw installError(INSTALL_ERROR_MESSAGE);
  }
}
var ArchivePathRegistry = class {
  #paths = /* @__PURE__ */ new Map();
  register(path4, kind) {
    const segments = path4.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      this.#registerDirectory(segments.slice(0, index).join("/"), false);
    }
    if (kind === "directory") {
      this.#registerDirectory(path4, true);
      return;
    }
    const key = canonicalArchivePath(path4);
    const existing = this.#paths.get(key);
    if (existing !== void 0) {
      throw new Error("archive path collision");
    }
    this.#paths.set(key, { kind: "file", path: path4, explicit: true });
  }
  #registerDirectory(path4, explicit) {
    const key = canonicalArchivePath(path4);
    const existing = this.#paths.get(key);
    if (existing === void 0) {
      this.#paths.set(key, { kind: "directory", path: path4, explicit });
      return;
    }
    if (existing.kind !== "directory" || existing.path !== path4) {
      throw new Error("archive path collision");
    }
    if (explicit && existing.explicit) {
      throw new Error("archive path collision");
    }
    if (explicit) {
      existing.explicit = true;
    }
  }
};
var ArchiveByteCounter = class extends Transform {
  fileBytes = 0;
  #limits;
  #state;
  constructor(limits, state) {
    super();
    this.#limits = limits;
    this.#state = state;
  }
  _transform(chunk, _encoding, callback) {
    this.fileBytes += chunk.byteLength;
    this.#state.total += chunk.byteLength;
    if (this.fileBytes > this.#limits.maxFileBytes || this.#state.total > this.#limits.maxTotalBytes) {
      callback(new Error("archive byte limit exceeded"));
      return;
    }
    callback(null, chunk);
  }
};
function resolveArchiveLimits(overrides) {
  const limits = { ...DEFAULT_ARCHIVE_LIMITS, ...overrides };
  for (const value of [
    limits.maxEntries,
    limits.maxTotalBytes,
    limits.maxFileBytes,
    limits.maxDepth
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("invalid archive limit");
    }
  }
  if (!Number.isFinite(limits.maxCompressionRatio) || limits.maxCompressionRatio < 0) {
    throw new Error("invalid archive limit");
  }
  return limits;
}
function classifyEntry(entry) {
  if (entry.isEncrypted() || !entry.canDecodeFileData()) {
    throw new Error("unsupported archive entry encoding");
  }
  const hasDirectorySlash = entry.fileName.endsWith("/");
  if (entry.versionMadeBy >>> 8 !== UNIX_PLATFORM) {
    return {
      kind: hasDirectorySlash ? "directory" : "file",
      executable: false
    };
  }
  const unixMode = entry.externalFileAttributes >>> 16 & 65535;
  const unixType = unixMode & UNIX_FILE_TYPE_MASK;
  if (unixType !== 0 && unixType !== UNIX_REGULAR_FILE && unixType !== UNIX_DIRECTORY) {
    throw new Error("unsupported Unix archive entry type");
  }
  if (unixType === UNIX_DIRECTORY && !hasDirectorySlash) {
    throw new Error("Unix directory entry lacks a directory path");
  }
  if (unixType === UNIX_REGULAR_FILE && hasDirectorySlash) {
    throw new Error("Unix regular file uses a directory path");
  }
  const kind = hasDirectorySlash ? "directory" : "file";
  return {
    kind,
    executable: kind === "file" && (unixMode & 73) !== 0
  };
}
function validateDeclaredEntry(entry, limits) {
  assertSafeSize(entry.compressedSize);
  assertSafeSize(entry.uncompressedSize);
  if (entry.uncompressedSize > limits.maxFileBytes) {
    throw new Error("archive file limit exceeded");
  }
  if (entry.uncompressedSize === 0) {
    return;
  }
  if (entry.compressedSize === 0 || entry.uncompressedSize / entry.compressedSize > limits.maxCompressionRatio) {
    throw new Error("archive compression ratio exceeded");
  }
}
function assertSafeSize(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("invalid archive size metadata");
  }
}
function addBoundedSize(current, addition, maximum) {
  const total = current + addition;
  if (!Number.isSafeInteger(total) || total > maximum) {
    throw new Error("archive total size limit exceeded");
  }
  return total;
}
function rejectInstallMarker(path4) {
  if (path4.split("/").some((segment) => segment.normalize("NFC").toLowerCase() === INSTALL_MARKER_NAME)) {
    throw new Error("archive contains a reserved install marker");
  }
}
function canonicalArchivePath(path4) {
  return path4.normalize("NFC").toLowerCase();
}
function assertPathContained(root, candidate) {
  const relativePath = relative2(root, candidate);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute2(relativePath)) {
    throw new Error("archive path escapes extraction root");
  }
}
async function ensureDirectoryTree(root, target, knownDirectories) {
  assertPathContained(root, target);
  const relativePath = relative2(root, target);
  if (relativePath.length === 0) {
    return;
  }
  let current = root;
  for (const segment of relativePath.split(sep)) {
    current = resolve2(current, segment);
    assertPathContained(root, current);
    if (!knownDirectories.has(current)) {
      try {
        await mkdir3(current, { mode: 493 });
      } catch (error) {
        if (error.code !== "EEXIST") {
          throw error;
        }
        const existing = await lstat2(current);
        if (!existing.isDirectory()) {
          throw new Error("archive directory conflicts with a file");
        }
      }
      knownDirectories.add(current);
    }
    await chmod3(current, 493);
  }
}
async function selectSkillLayout(rawRoot) {
  const topLevelNames = (await readdir2(rawRoot)).sort((left, right) => left.localeCompare(right, "en"));
  if (topLevelNames.includes("SKILL.md")) {
    const rootSkill = await lstat2(resolve2(rawRoot, "SKILL.md"));
    if (rootSkill.isFile()) {
      return { layout: "single", skillRoot: rawRoot };
    }
  }
  const skillRoots = [];
  const topLevelDirectories = [];
  for (const name of topLevelNames) {
    const candidateRoot = resolve2(rawRoot, name);
    assertPathContained(rawRoot, candidateRoot);
    const candidate = await lstat2(candidateRoot);
    if (!candidate.isDirectory()) {
      continue;
    }
    topLevelDirectories.push({ name, root: candidateRoot });
    const candidateNames = await readdir2(candidateRoot);
    if (!candidateNames.includes("SKILL.md")) {
      continue;
    }
    const skillFile = await lstat2(resolve2(candidateRoot, "SKILL.md"));
    if (!skillFile.isFile()) {
      throw new Error("archive skill SKILL.md is not a regular file");
    }
    skillRoots.push({ skillName: name, skillRoot: candidateRoot });
  }
  if (skillRoots.length === 1) {
    return { layout: "single", skillRoot: skillRoots[0].skillRoot };
  }
  if (skillRoots.length >= 2) {
    assertValidMultiSkillRoots(skillRoots);
    return { layout: "multi", skillRoots };
  }
  if (skillRoots.length === 0 && topLevelDirectories.length === 1) {
    const wrappedSkillRoots = await findDirectSkillRoots(topLevelDirectories[0].root);
    if (wrappedSkillRoots.length === 1) {
      return { layout: "single", skillRoot: wrappedSkillRoots[0].skillRoot };
    }
    if (wrappedSkillRoots.length >= 2) {
      assertValidMultiSkillRoots(wrappedSkillRoots);
      return { layout: "multi", skillRoots: wrappedSkillRoots };
    }
  }
  throw new Error("archive must contain one skill root or multiple one-level skill roots");
}
async function findDirectSkillRoots(parentRoot) {
  const names = (await readdir2(parentRoot)).sort((left, right) => left.localeCompare(right, "en"));
  const skillRoots = [];
  for (const name of names) {
    const candidateRoot = resolve2(parentRoot, name);
    assertPathContained(parentRoot, candidateRoot);
    const candidate = await lstat2(candidateRoot);
    if (!candidate.isDirectory()) {
      continue;
    }
    const candidateNames = await readdir2(candidateRoot);
    if (!candidateNames.includes("SKILL.md")) {
      continue;
    }
    const skillFile = await lstat2(resolve2(candidateRoot, "SKILL.md"));
    if (!skillFile.isFile()) {
      throw new Error("archive skill SKILL.md is not a regular file");
    }
    skillRoots.push({ skillName: name, skillRoot: candidateRoot });
  }
  return skillRoots;
}
function assertValidMultiSkillRoots(skillRoots) {
  for (const skill of skillRoots) {
    if (!isValidSkillName(skill.skillName) || skill.skillName.normalize("NFC").toLowerCase() === ".clink") {
      throw new Error("archive contains an invalid multi-skill name");
    }
  }
}
function closeZip(zipFile) {
  if (zipFile?.isOpen === true) {
    try {
      zipFile.close();
    } catch {
    }
  }
}

// dist/skills/download.js
import { createHash as createHash3 } from "node:crypto";
import { createWriteStream as createFileWriteStream } from "node:fs";
import { lstat as lstat3, rm as rm5 } from "node:fs/promises";
import { Readable, Transform as Transform2 } from "node:stream";
import { pipeline as pipeline2 } from "node:stream/promises";
var DEFAULT_DEPENDENCIES = {
  fetch: (...args) => globalThis.fetch(...args),
  sleep: async (ms) => new Promise((resolve4) => setTimeout(resolve4, ms)),
  createWriteStream: (destinationPath) => createFileWriteStream(destinationPath, { flags: "wx", mode: 384 })
};
var RETRYABLE = [408, 429, 500, 502, 503, 504];
var REDIRECTS = [301, 302, 303, 307, 308];
var MAX_ATTEMPTS = 2;
var MAX_REDIRECTS = 3;
var RETRY_DELAY_MS = 100;
var NETWORK_ERROR_MESSAGE = "failed to download skill package";
var REJECTED_TICKET_MESSAGE = "temporary skill download link was rejected";
var INSTALL_ERROR_MESSAGE2 = "failed to write skill package";
var RetryableDownloadError = class extends Error {
};
var NonRetryableDownloadError = class extends Error {
};
var RefreshTicketError = class extends Error {
};
var InstallDownloadError = class extends Error {
};
async function downloadSkillPackage(input, overrides) {
  try {
    await assertDestinationAbsent(input.destinationPath);
  } catch {
    throw installError(INSTALL_ERROR_MESSAGE2);
  }
  const dependencies = {
    fetch: overrides?.fetch ?? DEFAULT_DEPENDENCIES.fetch,
    sleep: overrides?.sleep ?? DEFAULT_DEPENDENCIES.sleep,
    createWriteStream: overrides?.createWriteStream ?? DEFAULT_DEPENDENCIES.createWriteStream
  };
  const state = { createdDestination: false };
  let ticket = input.ticket;
  let refreshed = false;
  try {
    while (true) {
      try {
        return await downloadWithRetries(ticket, input.destinationPath, input.timeoutMs, dependencies, state);
      } catch (error) {
        if (!(error instanceof RefreshTicketError) || refreshed) {
          throw error;
        }
        refreshed = true;
        ticket = await input.refreshTicket();
      }
    }
  } catch (error) {
    const cleaned = await cleanupDestination(input.destinationPath, state);
    if (!cleaned) {
      throw installError(INSTALL_ERROR_MESSAGE2);
    }
    if (error instanceof InstallDownloadError) {
      throw installError(INSTALL_ERROR_MESSAGE2);
    }
    if (error instanceof CliError) {
      throw error;
    }
    if (error instanceof RefreshTicketError && refreshed) {
      throw networkError(REJECTED_TICKET_MESSAGE);
    }
    throw networkError(NETWORK_ERROR_MESSAGE);
  }
}
async function downloadWithRetries(ticket, destinationPath, timeoutMs, dependencies, state) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await downloadTimedAttempt(ticket, destinationPath, timeoutMs, dependencies, state);
    } catch (error) {
      if (!(error instanceof RetryableDownloadError)) {
        throw error;
      }
      const cleaned = await cleanupDestination(destinationPath, state);
      if (!cleaned || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }
      await dependencies.sleep(RETRY_DELAY_MS);
    }
  }
  throw new RetryableDownloadError();
}
async function downloadTimedAttempt(ticket, destinationPath, timeoutMs, dependencies, state) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await downloadAttempt(ticket, destinationPath, dependencies, state, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}
async function downloadAttempt(ticket, destinationPath, dependencies, state, signal) {
  let requestUrl = validateDownloadUrl(ticket.url);
  let response;
  let followedRedirects = 0;
  while (response === void 0) {
    let candidate;
    try {
      candidate = await dependencies.fetch(requestUrl, {
        method: "GET",
        redirect: "manual",
        signal
      });
    } catch {
      throw new RetryableDownloadError();
    }
    if (!REDIRECTS.includes(candidate.status)) {
      response = candidate;
      break;
    }
    await cancelResponseBody(candidate);
    if (followedRedirects === MAX_REDIRECTS) {
      throw new NonRetryableDownloadError();
    }
    const location = candidate.headers.get("location");
    if (location === null) {
      throw new NonRetryableDownloadError();
    }
    try {
      requestUrl = validateDownloadUrl(new URL(location, requestUrl));
    } catch {
      throw new NonRetryableDownloadError();
    }
    followedRedirects += 1;
  }
  if (response.status === 401 || response.status === 403) {
    await cancelResponseBody(response);
    throw new RefreshTicketError();
  }
  if (RETRYABLE.includes(response.status)) {
    await cancelResponseBody(response);
    throw new RetryableDownloadError();
  }
  if (response.status < 200 || response.status >= 300) {
    await cancelResponseBody(response);
    throw new NonRetryableDownloadError();
  }
  if (response.body === null) {
    throw new RetryableDownloadError();
  }
  if (!hasExpectedContentLength(response.headers, ticket.sizeBytes)) {
    await cancelResponseBody(response);
    throw new NonRetryableDownloadError();
  }
  let firstFailureOrigin;
  try {
    const hash = createHash3("sha256");
    let actualBytes = 0;
    const meter = new Transform2({
      transform(chunk, _encoding, callback) {
        if (actualBytes + chunk.byteLength > ticket.sizeBytes) {
          callback(new RetryableDownloadError());
          return;
        }
        actualBytes += chunk.byteLength;
        hash.update(chunk);
        callback(null, chunk);
      }
    });
    const destination = dependencies.createWriteStream(destinationPath);
    try {
      await new Promise((resolve4, reject) => {
        const onOpen = () => {
          destination.off("error", onError);
          resolve4();
        };
        const onError = (error) => {
          destination.off("open", onOpen);
          reject(error);
        };
        destination.once("open", onOpen);
        destination.once("error", onError);
      });
    } catch {
      await cancelResponseBody(response);
      throw new InstallDownloadError();
    }
    state.createdDestination = true;
    const source = Readable.fromWeb(response.body);
    source.once("error", () => {
      firstFailureOrigin ??= "source";
    });
    meter.once("error", () => {
      firstFailureOrigin ??= "meter";
    });
    destination.once("error", () => {
      firstFailureOrigin ??= "destination";
    });
    await pipeline2(source, meter, destination, { signal });
    if (actualBytes !== ticket.sizeBytes) {
      throw new RetryableDownloadError();
    }
    return {
      path: destinationPath,
      sizeBytes: actualBytes,
      sha256: hash.digest("hex")
    };
  } catch (error) {
    if (error instanceof InstallDownloadError) {
      throw error;
    }
    if (!signal.aborted && firstFailureOrigin === "destination") {
      throw new InstallDownloadError();
    }
    throw new RetryableDownloadError();
  }
}
async function cleanupDestination(destinationPath, state) {
  if (!state.createdDestination) {
    return true;
  }
  try {
    await rm5(destinationPath, { force: true });
    state.createdDestination = false;
    return true;
  } catch {
    return false;
  }
}
async function assertDestinationAbsent(destinationPath) {
  try {
    await lstat3(destinationPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw new InstallDownloadError();
  }
  throw new InstallDownloadError();
}
function validateDownloadUrl(url) {
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    throw new NonRetryableDownloadError();
  }
  return url;
}
function hasExpectedContentLength(headers, expectedBytes) {
  const value = headers.get("content-length");
  if (value === null) {
    return true;
  }
  if (!/^\d+$/.test(value)) {
    return false;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed === expectedBytes;
}
async function cancelResponseBody(response) {
  try {
    await response.body?.cancel();
  } catch {
  }
}

// dist/skills/metrics.js
var PUBLIC_DOWNLOAD_METRIC_SOURCE = "AGENT_CLI";
var TIP_METRIC_SOURCE = "CLINK_PAYMENT";
var PUBLIC_DOWNLOAD_METRIC_PATH_PREFIX = "/prod-api/skill-marketplace/internal/skills";
async function reportSkillPublicDownload(input, overrides = {}) {
  await reportSkillMetric(input, "public-download", { source: PUBLIC_DOWNLOAD_METRIC_SOURCE }, overrides);
}
async function reportSkillTip(input, overrides = {}) {
  await reportSkillMetric(input, "tip", compact2({
    orderId: input.orderId,
    versionNo: input.versionNo,
    amount: input.amount,
    currency: input.currency,
    source: TIP_METRIC_SOURCE
  }), overrides);
}
function compact2(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== void 0));
}
async function reportSkillMetric(input, metric, body, overrides) {
  const dependencies = {
    fetch: overrides.fetch ?? globalThis.fetch
  };
  const url = new URL(`${PUBLIC_DOWNLOAD_METRIC_PATH_PREFIX}/${encodeURIComponent(input.skillId)}/metrics/${metric}`, ensureTrailingSlash2(input.dashboardBaseUrl));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await dependencies.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CLI_VERSION_HEADER]: CLI_VERSION
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    await response.body?.cancel();
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`failed to report skill ${metric}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
function ensureTrailingSlash2(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

// dist/skills/registry.js
import path3 from "node:path";

// dist/skills/public-api.js
var CLINK_PUBLIC_CLIENT_ID = "e5cd7e4891bf95d1d19206ce24a7b32e";
var DEFAULT_MAX_RESPONSE_BODY_BYTES = 64 * 1024;
var MAX_ATTEMPTS2 = 3;
var RETRYABLE_STATUSES = /* @__PURE__ */ new Set([408, 429, 500, 502, 503, 504]);
var INVALID_RESPONSE_MESSAGE = "invalid public skills response";
var NETWORK_ERROR_MESSAGE2 = "failed to request public skills API";
var INVALID_BASE_URL_MESSAGE = "invalid skill registry base URL";
async function requestPublicSkillsJson(input, overrides = {}) {
  const dependencies = {
    fetch: overrides.fetch ?? globalThis.fetch,
    sleep: overrides.sleep ?? (async (ms) => new Promise((resolve4) => setTimeout(resolve4, ms))),
    random: overrides.random ?? Math.random
  };
  const invalidResponseMessage = input.invalidResponseMessage ?? INVALID_RESPONSE_MESSAGE;
  const invalidResponseCode = input.invalidResponseCode ?? 502;
  const networkErrorMessage = input.networkErrorMessage ?? NETWORK_ERROR_MESSAGE2;
  const maxResponseBodyBytes = input.maxResponseBodyBytes ?? DEFAULT_MAX_RESPONSE_BODY_BYTES;
  const requestUrl = new URL(input.path, parseRegistryBaseUrl(input.baseUrl));
  for (const [key, value] of Object.entries(input.query)) {
    if (value !== void 0) {
      requestUrl.searchParams.set(key, String(value));
    }
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await dependencies.fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Clientid: CLINK_PUBLIC_CLIENT_ID,
          [CLI_VERSION_HEADER]: CLI_VERSION
        },
        signal: controller.signal
      });
      if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS2 - 1) {
        await cancelResponseBody2(response);
        await sleepBeforeRetry(dependencies, attempt);
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        await cancelResponseBody2(response);
        assertApiSuccess(response.status, void 0);
      }
      return await readLimitedJsonBody(response, invalidResponseMessage, invalidResponseCode, maxResponseBodyBytes);
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }
      if (attempt === MAX_ATTEMPTS2 - 1) {
        throw networkError(networkErrorMessage);
      }
      await sleepBeforeRetry(dependencies, attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw networkError(networkErrorMessage);
}
function parseRegistryBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw configError(INVALID_BASE_URL_MESSAGE);
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    throw configError(INVALID_BASE_URL_MESSAGE);
  }
  return url;
}
async function readLimitedJsonBody(response, invalidResponseMessage, invalidResponseCode, maxResponseBodyBytes) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxResponseBodyBytes) {
    await cancelResponseBody2(response);
    throw apiError(invalidResponseMessage, invalidResponseCode);
  }
  if (response.body === null) {
    throw apiError(invalidResponseMessage, invalidResponseCode);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBodyBytes) {
        try {
          await reader.cancel();
        } catch {
        }
        throw apiError(invalidResponseMessage, invalidResponseCode);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw apiError(invalidResponseMessage, invalidResponseCode);
  }
}
async function cancelResponseBody2(response) {
  try {
    await response.body?.cancel();
  } catch {
  }
}
async function sleepBeforeRetry(dependencies, attempt) {
  const delay = Math.min(1e3, 100 * 2 ** attempt) + Math.floor(dependencies.random() * 50);
  await dependencies.sleep(delay);
}

// dist/skills/marketplace.js
var PUBLIC_SKILLS_MARKETPLACE_PATH = "/prod-api/skill-marketplace/public/skills";
var LIST_ALL_MAX_RESPONSE_BODY_BYTES = 4 * 1024 * 1024;
async function listAllPublicSkills(input, request = requestPublicSkillsJson) {
  const body = await request({
    baseUrl: input.dashboardBaseUrl,
    path: PUBLIC_SKILLS_MARKETPLACE_PATH,
    query: { pageSize: 999, sort: "NEW" },
    timeoutMs: input.timeoutMs,
    maxResponseBodyBytes: LIST_ALL_MAX_RESPONSE_BODY_BYTES
  });
  const items = selectPublicSkillItems(body);
  if (!items) {
    throw apiError("invalid public skills response", 502);
  }
  const listableItems = items.filter(isListablePublicSkill);
  const selectedItems = input.tippableOnly ? listableItems.filter(isTippablePublicSkill) : listableItems;
  return [...selectedItems].reverse().map((item, index) => {
    const copy = { ...item };
    delete copy.Number;
    return { Number: index + 1, ...copy };
  });
}
function isListablePublicSkill(item) {
  return hasNonemptyString(item.publisher) && hasNonemptyString(item.name) && hasNonemptyString(item.versionNo);
}
function isTippablePublicSkill(item) {
  if (!hasNonemptyString(item.skillId) || !hasNonemptyString(item.merchantId)) {
    return false;
  }
  return parseTipsConfig(item.tipsConfigJson)?.enabled === true;
}
function parseTipsConfig(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    return isRecord9(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function hasNonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function selectPublicSkillItems(body) {
  const payload = selectPublicSkillPayload(body);
  if (!payload || !Array.isArray(payload.items) || !payload.items.every(isRecord9)) {
    return void 0;
  }
  return payload.items;
}
function selectPublicSkillPayload(body) {
  if (isRecord9(body) && Array.isArray(body.items)) {
    return body;
  }
  const unwrapped = unwrapApiData(body);
  if (isRecord9(unwrapped) && Array.isArray(unwrapped.items)) {
    return unwrapped;
  }
  return void 0;
}
function isRecord9(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/skills/registry.js
var MAX_DOWNLOAD_SIZE_BYTES = 50 * 1024 * 1024;
var INVALID_RESPONSE_MESSAGE2 = "invalid skill download ticket response";
var NETWORK_ERROR_MESSAGE3 = "failed to resolve skill download ticket";
var SKILL_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
var MAX_SKILL_ID_LENGTH = 128;
async function getSkillDownloadTicket(input, overrides) {
  const body = await requestPublicSkillsJson({
    baseUrl: input.baseUrl,
    path: `${PUBLIC_SKILLS_MARKETPLACE_PATH}/download-url`,
    query: {
      publisher: input.packageSpec.publisher,
      skillName: input.packageSpec.skillName,
      versionNo: input.packageSpec.requestedVersion ?? void 0
    },
    timeoutMs: input.timeoutMs,
    invalidResponseMessage: INVALID_RESPONSE_MESSAGE2,
    invalidResponseCode: 400,
    networkErrorMessage: NETWORK_ERROR_MESSAGE3
  }, overrides);
  return parseDownloadTicket(unwrapApiData(body));
}
function parseDownloadTicket(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw apiError(INVALID_RESPONSE_MESSAGE2);
  }
  const candidate = body;
  const downloadUrl = parseDownloadUrl(candidate.downloadUrl);
  const skillId = parseOptionalSkillId(candidate.skillId);
  if (!isPositiveSafeInteger(candidate.expireSeconds) || !isSafeFileName(candidate.fileName) || !isPositiveSafeInteger(candidate.sizeBytes) || candidate.sizeBytes > MAX_DOWNLOAD_SIZE_BYTES) {
    throw apiError(INVALID_RESPONSE_MESSAGE2);
  }
  return {
    ...skillId === void 0 ? {} : { skillId },
    url: downloadUrl,
    expireSeconds: candidate.expireSeconds,
    fileName: candidate.fileName,
    sizeBytes: candidate.sizeBytes
  };
}
function parseDownloadUrl(value) {
  if (typeof value !== "string") {
    throw apiError(INVALID_RESPONSE_MESSAGE2);
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw apiError(INVALID_RESPONSE_MESSAGE2);
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    throw apiError(INVALID_RESPONSE_MESSAGE2);
  }
  return url;
}
function parseOptionalSkillId(value) {
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_SKILL_ID_LENGTH || !SKILL_ID_PATTERN.test(value)) {
    throw apiError(INVALID_RESPONSE_MESSAGE2);
  }
  return value;
}
function isPositiveSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function isSafeFileName(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 255 && value !== "." && value !== ".." && path3.posix.basename(value) === value && path3.win32.basename(value) === value && !/[\u0000-\u001f\u007f]/.test(value);
}

// dist/skills/store.js
import { join as join4 } from "node:path";

// dist/skills/store-publication.js
import { randomUUID as randomUUID3 } from "node:crypto";
import { constants as constants2 } from "node:fs";
import { chmod as chmod4, cp as cp2, copyFile as copyFile2, link, lstat as lstat4, mkdir as mkdir4, open as open4, readdir as readdir3, readlink as readlink2, realpath as realpath2, rename as rename3, rm as rm6, symlink as symlink2, utimes } from "node:fs/promises";
import { basename, dirname as dirname3, isAbsolute as isAbsolute3, join as join3, relative as relative3, resolve as resolve3, sep as sep2 } from "node:path";
var PUBLISH_CONFLICT_MESSAGE = "skill install conflicts with existing content";
var PUBLISH_FAILURE_MESSAGE = "failed to publish skill release";
var PUBLISH_ROLLBACK_MESSAGE = "failed to roll back skill release";
var PUBLISH_FINALIZE_MESSAGE = "failed to finalize skill release";
var INSTALL_MARKER_NAME2 = ".clink-install.json";
var SHA256_PATTERN = /^[a-f0-9]{64}$/;
var MovedBackupError = class extends Error {
  backup;
  constructor(backup) {
    super("current changed while being backed up");
    this.backup = backup;
  }
};
async function publishSkillRelease(input) {
  const paths = input.paths;
  validatePublicationInput(paths, input.extractedRoot, input.marker, input.uuid);
  let current;
  let existingRelease;
  try {
    current = await inspectCurrent(paths);
    if (current !== null && (current.managed === null || current.managed.marker.publisher !== input.marker.publisher || current.managed.marker.skillName !== input.marker.skillName)) {
      if (!input.force) {
        throw installError(PUBLISH_CONFLICT_MESSAGE);
      }
    }
    if (current?.managed !== null && current?.managed !== void 0 && current.managed.marker.publisher === input.marker.publisher && current.managed.marker.skillName === input.marker.skillName && current.managed.marker.sha256 === input.marker.sha256) {
      const expectedRelease = await canonicalExistingReleasePath(paths.releasePath, paths.releasesRoot);
      if (expectedRelease !== current.managed.canonicalReleasePath) {
        throw installError(PUBLISH_CONFLICT_MESSAGE);
      }
      const confirmedCurrent = await inspectCurrent(paths);
      if (confirmedCurrent?.managed === null || confirmedCurrent?.managed === void 0 || !samePathFingerprint(confirmedCurrent.fingerprint, current.fingerprint) || confirmedCurrent.managed.canonicalReleasePath !== expectedRelease || confirmedCurrent.managed.marker.publisher !== input.marker.publisher || confirmedCurrent.managed.marker.skillName !== input.marker.skillName || confirmedCurrent.managed.marker.sha256 !== input.marker.sha256) {
        throw installError(PUBLISH_CONFLICT_MESSAGE);
      }
      return createUnchangedPublication(paths);
    }
    existingRelease = await inspectExistingRelease(paths.releasePath, paths.releasesRoot, input.marker);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw installError(PUBLISH_FAILURE_MESSAGE);
  }
  const transaction = {
    paths,
    marker: input.marker,
    uuid: input.uuid,
    oldCurrent: current,
    backup: null,
    newCurrent: null,
    createdRelease: null
  };
  try {
    if (existingRelease === null) {
      transaction.createdRelease = await createImmutableRelease(paths, input.extractedRoot, input.marker);
    }
    const selectedRelease = transaction.createdRelease?.fingerprint ?? existingRelease;
    if (selectedRelease === null) {
      existingRelease = await inspectExistingRelease(paths.releasePath, paths.releasesRoot, input.marker);
    }
    const expectedRelease = transaction.createdRelease?.fingerprint ?? existingRelease;
    if (expectedRelease === null) {
      throw new Error("published release is missing");
    }
    await assertReleaseAuthenticated(paths, input.marker, expectedRelease);
    if (current !== null) {
      const compatibleManaged = current.managed !== null && current.managed.marker.publisher === input.marker.publisher && current.managed.marker.skillName === input.marker.skillName;
      const backupName = compatibleManaged ? `.${input.uuid}-transient` : input.uuid;
      try {
        await paths.publicationMutationHook?.({ phase: "before-current-backup" });
        transaction.backup = await moveCurrentToBackup(paths, current.fingerprint, backupName, !compatibleManaged);
      } catch (error) {
        if (error instanceof MovedBackupError) {
          transaction.backup = error.backup;
        }
        throw error;
      }
      await paths.publicationMutationHook?.({ phase: "after-backup" });
      await assertReleaseAuthenticated(paths, input.marker, expectedRelease);
    }
    const target = relative3(dirname3(paths.currentPath), paths.releasePath);
    await symlink2(target, paths.currentPath, "dir");
    const newCurrent = await fingerprintPath2(paths.currentPath);
    if (newCurrent.kind !== "symlink" || newCurrent.linkTarget !== target) {
      throw new Error("current link changed during creation");
    }
    transaction.newCurrent = newCurrent;
    await assertReleaseAuthenticated(paths, input.marker, expectedRelease);
    await paths.publicationMutationHook?.({ phase: "after-current-switch" });
    return createPublishedTransaction(transaction, current === null ? "installed" : "updated");
  } catch (error) {
    try {
      await rollbackPublicationTransaction(transaction);
    } catch {
    }
    if (error instanceof CliError) {
      throw error;
    }
    throw installError(PUBLISH_FAILURE_MESSAGE);
  }
}
function createUnchangedPublication(paths) {
  let state = "active";
  return {
    action: "unchanged",
    releasePath: paths.releasePath,
    currentPath: paths.currentPath,
    backupPath: null,
    async rollback() {
      if (state === "active") {
        state = "rolled-back";
      }
    },
    async finalize() {
      if (state === "active") {
        state = "committed";
      }
    }
  };
}
function createPublishedTransaction(transaction, action) {
  let state = "active";
  return {
    action,
    releasePath: transaction.paths.releasePath,
    currentPath: transaction.paths.currentPath,
    backupPath: transaction.backup?.retained === true ? transaction.backup.containerPath : null,
    async rollback() {
      if (state !== "active") {
        return;
      }
      try {
        await rollbackPublicationTransaction(transaction);
        state = "rolled-back";
      } catch {
        throw installError(PUBLISH_ROLLBACK_MESSAGE);
      }
    },
    async finalize() {
      if (state !== "active") {
        return;
      }
      try {
        if (transaction.backup !== null && !transaction.backup.retained) {
          await removeAuthenticatedBackup(transaction.backup);
          transaction.backup = null;
        }
        state = "committed";
      } catch {
        throw installError(PUBLISH_FINALIZE_MESSAGE);
      }
    }
  };
}
function validatePublicationInput(paths, extractedRoot, marker, uuid) {
  if (!isInstallMarker(marker) || !SHA256_PATTERN.test(marker.sha256)) {
    throw installError(PUBLISH_FAILURE_MESSAGE);
  }
  if (!isSafePathSegment(marker.publisher) || !isSafePathSegment(marker.skillName)) {
    throw installError(PUBLISH_FAILURE_MESSAGE);
  }
  if (!isSafePathSegment(uuid)) {
    throw installError(PUBLISH_FAILURE_MESSAGE);
  }
  const expectedRelease = resolve3(paths.releasesRoot, marker.publisher, marker.skillName, marker.sha256);
  if (resolve3(paths.releasePath) !== expectedRelease || basename(paths.currentPath) !== marker.skillName || resolve3(extractedRoot) === resolve3(paths.releasePath)) {
    throw installError(PUBLISH_FAILURE_MESSAGE);
  }
}
function isSafePathSegment(value) {
  return value.length > 0 && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\") && !value.includes("\0");
}
async function inspectCurrent(paths) {
  let fingerprint;
  try {
    fingerprint = await fingerprintPath2(paths.currentPath);
  } catch (error) {
    if (isErrorCode2(error, "ENOENT")) {
      return null;
    }
    throw error;
  }
  if (fingerprint.kind !== "symlink" || fingerprint.linkTarget === null) {
    return { fingerprint, managed: null };
  }
  const managed = await inspectManagedCurrent(paths, fingerprint);
  return { fingerprint, managed };
}
async function inspectManagedCurrent(paths, fingerprint) {
  try {
    const canonicalRoot = await realpath2(paths.releasesRoot);
    const rootStat = await lstat4(paths.releasesRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      return null;
    }
    const canonicalReleasePath = await realpath2(paths.currentPath);
    const releaseStat = await lstat4(canonicalReleasePath);
    if (!releaseStat.isDirectory() || releaseStat.isSymbolicLink()) {
      return null;
    }
    const releaseParts = pathPartsBelow(canonicalRoot, canonicalReleasePath);
    if (releaseParts === null || releaseParts.length !== 3) {
      return null;
    }
    const [publisher, skillName, sha256] = releaseParts;
    if (!SHA256_PATTERN.test(sha256)) {
      return null;
    }
    const marker = await readNoFollowInstallMarker(join3(canonicalReleasePath, INSTALL_MARKER_NAME2));
    if (marker === null || marker.publisher !== publisher || marker.skillName !== skillName || marker.sha256 !== sha256) {
      return null;
    }
    const confirmed = await fingerprintPath2(paths.currentPath);
    if (!samePathFingerprint(fingerprint, confirmed)) {
      return null;
    }
    return {
      fingerprint,
      linkTarget: fingerprint.linkTarget,
      canonicalReleasePath,
      marker
    };
  } catch {
    return null;
  }
}
async function canonicalExistingReleasePath(releasePath, releasesRoot) {
  const releaseStat = await lstat4(releasePath);
  const rootStat = await lstat4(releasesRoot);
  if (!releaseStat.isDirectory() || releaseStat.isSymbolicLink() || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw installError(PUBLISH_CONFLICT_MESSAGE);
  }
  const canonicalRoot = await realpath2(releasesRoot);
  const canonicalRelease = await realpath2(releasePath);
  const parts = pathPartsBelow(canonicalRoot, canonicalRelease);
  if (parts === null || parts.length !== 3) {
    throw installError(PUBLISH_CONFLICT_MESSAGE);
  }
  return canonicalRelease;
}
async function inspectExistingRelease(releasePath, releasesRoot, marker) {
  let fingerprint;
  try {
    fingerprint = await fingerprintPath2(releasePath);
  } catch (error) {
    if (isErrorCode2(error, "ENOENT")) {
      return null;
    }
    throw error;
  }
  if (fingerprint.kind !== "directory") {
    throw installError(PUBLISH_CONFLICT_MESSAGE);
  }
  const canonicalRelease = await canonicalExistingReleasePath(releasePath, releasesRoot);
  const canonicalRoot = await realpath2(releasesRoot);
  const expectedParts = [marker.publisher, marker.skillName, marker.sha256];
  const actualParts = pathPartsBelow(canonicalRoot, canonicalRelease);
  const existingMarker = await readNoFollowInstallMarker(join3(releasePath, INSTALL_MARKER_NAME2));
  if (actualParts === null || actualParts.length !== expectedParts.length || actualParts.some((part, index) => part !== expectedParts[index]) || existingMarker === null || !sameInstallMarker(existingMarker, marker)) {
    throw installError(PUBLISH_CONFLICT_MESSAGE);
  }
  return fingerprint;
}
async function assertReleaseAuthenticated(paths, marker, expected) {
  const current = await inspectExistingRelease(paths.releasePath, paths.releasesRoot, marker);
  if (current === null || !samePathFingerprint(current, expected)) {
    throw new Error("selected release changed during publication");
  }
}
function pathPartsBelow(rootPath, candidatePath) {
  const childPath = relative3(rootPath, candidatePath);
  if (childPath.length === 0 || childPath === ".." || childPath.startsWith(`..${sep2}`) || isAbsolute3(childPath)) {
    return null;
  }
  return childPath.split(sep2);
}
async function createImmutableRelease(paths, extractedRoot, marker) {
  const extracted = await fingerprintPath2(extractedRoot);
  if (extracted.kind !== "directory") {
    throw new Error("extracted skill root is not a real directory");
  }
  await ensureReleaseParent(paths, marker);
  await writeInstallMarker(extractedRoot, marker);
  await paths.publicationMutationHook?.({ phase: "before-release-rename" });
  const existingRelease = await inspectExistingRelease(paths.releasePath, paths.releasesRoot, marker);
  if (existingRelease !== null) {
    return null;
  }
  await rename3(extractedRoot, paths.releasePath);
  const releaseFingerprint = await fingerprintPath2(paths.releasePath);
  if (releaseFingerprint.kind !== "directory" || releaseFingerprint.dev !== extracted.dev || releaseFingerprint.ino !== extracted.ino) {
    throw new Error("release changed during publication");
  }
  const installedMarker = await readNoFollowInstallMarker(join3(paths.releasePath, INSTALL_MARKER_NAME2));
  if (installedMarker === null || !sameInstallMarker(installedMarker, marker)) {
    throw new Error("release marker changed during publication");
  }
  return { fingerprint: releaseFingerprint, marker };
}
async function ensureReleaseParent(paths, marker) {
  await ensureRealDirectory(paths.releasesRoot);
  const publisherPath = join3(paths.releasesRoot, marker.publisher);
  await ensureRealDirectory(publisherPath);
  await ensureRealDirectory(join3(publisherPath, marker.skillName));
}
async function ensureRealDirectory(path4) {
  await mkdir4(path4, { recursive: true, mode: 448 });
  const pathStat = await lstat4(path4);
  if (!pathStat.isDirectory() || pathStat.isSymbolicLink()) {
    throw new Error("store path is not a real directory");
  }
}
async function writeInstallMarker(rootPath, marker) {
  const markerPath = join3(rootPath, INSTALL_MARKER_NAME2);
  const handle = await open4(markerPath, constants2.O_WRONLY | constants2.O_CREAT | constants2.O_EXCL | constants2.O_NOFOLLOW, 420);
  try {
    await handle.writeFile(JSON.stringify(marker), "utf8");
    await handle.chmod(420);
  } finally {
    await handle.close();
  }
}
async function readNoFollowInstallMarker(path4) {
  const parsed = await readNoFollowJson(path4);
  return isInstallMarker(parsed) ? parsed : null;
}
async function readNoFollowJson(path4) {
  let handle;
  try {
    handle = await open4(path4, constants2.O_RDONLY | constants2.O_NOFOLLOW);
    const before = await handle.stat();
    if (!before.isFile()) {
      return null;
    }
    const raw = await handle.readFile("utf8");
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || !after.isFile()) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}
function isInstallMarker(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const marker = value;
  const keys = Object.keys(marker).sort();
  const expectedKeys = [
    "installedAt",
    "publisher",
    "requestedVersion",
    "schemaVersion",
    "sha256",
    "sizeBytes",
    "skillName"
  ];
  return keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index]) && marker.schemaVersion === 1 && typeof marker.publisher === "string" && typeof marker.skillName === "string" && (marker.requestedVersion === null || typeof marker.requestedVersion === "string") && typeof marker.sha256 === "string" && SHA256_PATTERN.test(marker.sha256) && typeof marker.sizeBytes === "number" && Number.isSafeInteger(marker.sizeBytes) && marker.sizeBytes >= 0 && typeof marker.installedAt === "string" && marker.installedAt.length > 0;
}
function sameInstallMarker(first, second) {
  return first.schemaVersion === second.schemaVersion && first.publisher === second.publisher && first.skillName === second.skillName && first.requestedVersion === second.requestedVersion && first.sha256 === second.sha256 && first.sizeBytes === second.sizeBytes && first.installedAt === second.installedAt;
}
async function moveCurrentToBackup(paths, expectedCurrent, backupName, retained) {
  await assertPathFingerprint(paths.currentPath, expectedCurrent);
  await ensureRealDirectory(paths.backupsRoot);
  const containerPath = join3(paths.backupsRoot, backupName);
  await mkdir4(containerPath, { mode: 448 });
  const containerFingerprint = await fingerprintPath2(containerPath);
  if (containerFingerprint.kind !== "directory") {
    throw new Error("backup container is not a directory");
  }
  const entryPath = join3(containerPath, basename(paths.currentPath));
  try {
    await assertPathFingerprint(paths.currentPath, expectedCurrent);
    await rename3(paths.currentPath, entryPath);
  } catch (error) {
    await removeEmptyOwnedContainer(containerPath, containerFingerprint);
    throw error;
  }
  const entryFingerprint = await fingerprintPath2(entryPath);
  const backup = {
    containerPath,
    entryPath,
    containerFingerprint,
    entryFingerprint,
    retained
  };
  if (!samePathFingerprint(entryFingerprint, expectedCurrent)) {
    throw new MovedBackupError(backup);
  }
  try {
    await lstat4(paths.currentPath);
    throw new MovedBackupError(backup);
  } catch (error) {
    if (isErrorCode2(error, "ENOENT")) {
      return backup;
    }
    throw error;
  }
}
async function removeEmptyOwnedContainer(containerPath, expected) {
  try {
    const current = await fingerprintPath2(containerPath);
    if (samePathFingerprint(current, expected) && current.kind === "directory" && (await readdir3(containerPath)).length === 0) {
      await rm6(containerPath, { recursive: true });
    }
  } catch {
  }
}
async function rollbackPublicationTransaction(transaction) {
  let rollbackFailed = false;
  let currentSafeForReleaseCleanup = true;
  if (transaction.newCurrent !== null) {
    try {
      await removeExpectedCurrent(transaction.paths.currentPath, transaction.newCurrent, transaction.paths.backupsRoot, `.${transaction.uuid}-new-current`);
      transaction.newCurrent = null;
    } catch {
      rollbackFailed = true;
      currentSafeForReleaseCleanup = false;
    }
  } else {
    try {
      const current = await fingerprintPath2(transaction.paths.currentPath);
      if (transaction.oldCurrent === null || !samePathFingerprint(current, transaction.oldCurrent.fingerprint)) {
        currentSafeForReleaseCleanup = false;
      }
    } catch (error) {
      if (!isErrorCode2(error, "ENOENT")) {
        rollbackFailed = true;
        currentSafeForReleaseCleanup = false;
      }
    }
  }
  if (transaction.backup !== null) {
    try {
      await restoreBackup(transaction.paths.currentPath, transaction.backup);
      if (!transaction.backup.retained) {
        await removeAuthenticatedBackup(transaction.backup);
      }
      transaction.backup = transaction.backup.retained ? transaction.backup : null;
    } catch {
      rollbackFailed = true;
      currentSafeForReleaseCleanup = false;
    }
  }
  if (transaction.createdRelease !== null && currentSafeForReleaseCleanup) {
    try {
      await removeCreatedRelease(transaction.paths.releasePath, transaction.paths.releasesRoot, transaction.createdRelease, transaction.uuid);
      transaction.createdRelease = null;
    } catch {
      rollbackFailed = true;
    }
  }
  if (rollbackFailed) {
    throw new Error("publication rollback was incomplete");
  }
}
async function removeExpectedCurrent(currentPath, expected, backupsRoot, cleanupName) {
  let current;
  try {
    current = await fingerprintPath2(currentPath);
  } catch (error) {
    if (isErrorCode2(error, "ENOENT")) {
      return;
    }
    throw error;
  }
  if (!samePathFingerprint(current, expected)) {
    throw new Error("current was replaced before rollback");
  }
  await ensureRealDirectory(backupsRoot);
  const containerPath = join3(backupsRoot, cleanupName);
  await mkdir4(containerPath, { mode: 448 });
  const containerFingerprint = await fingerprintPath2(containerPath);
  const entryPath = join3(containerPath, basename(currentPath));
  await rename3(currentPath, entryPath);
  const moved = await fingerprintPath2(entryPath);
  if (!samePathFingerprint(moved, expected)) {
    await restoreBackup(currentPath, {
      containerPath,
      entryPath,
      containerFingerprint,
      entryFingerprint: moved,
      retained: true
    });
    throw new Error("current changed while rollback moved it");
  }
  await removeAuthenticatedBackup({
    containerPath,
    entryPath,
    containerFingerprint,
    entryFingerprint: expected,
    retained: false
  });
}
async function restoreBackup(currentPath, backup) {
  await assertBackupAuthenticated(backup);
  try {
    await lstat4(currentPath);
    throw new Error("current path is occupied during restoration");
  } catch (error) {
    if (!isErrorCode2(error, "ENOENT")) {
      throw error;
    }
  }
  switch (backup.entryFingerprint.kind) {
    case "symlink": {
      if (backup.entryFingerprint.linkTarget === null) {
        throw new Error("backup link target is unavailable");
      }
      await symlink2(backup.entryFingerprint.linkTarget, currentPath, "dir");
      break;
    }
    case "file":
      if (backup.retained) {
        await copyFile2(backup.entryPath, currentPath, constants2.COPYFILE_EXCL);
        await chmod4(currentPath, backup.entryFingerprint.mode & 4095);
        await assertBackupAuthenticated(backup);
        const atime = backup.entryFingerprint.atimeMs / 1e3;
        const mtime = backup.entryFingerprint.mtimeMs / 1e3;
        await utimes(currentPath, atime, mtime);
        await utimes(backup.entryPath, atime, mtime);
      } else {
        await link(backup.entryPath, currentPath);
      }
      break;
    case "directory":
      await restoreDirectory(backup.entryPath, currentPath, backup.entryFingerprint.mode);
      break;
    default:
      throw new Error("backup type cannot be restored safely");
  }
  const restored = await fingerprintPath2(currentPath);
  if (backup.entryFingerprint.kind === "symlink") {
    if (restored.kind !== "symlink" || restored.linkTarget !== backup.entryFingerprint.linkTarget) {
      throw new Error("restored link does not match its backup");
    }
  } else if (backup.entryFingerprint.kind === "file" && (restored.kind !== "file" || (backup.retained ? restored.dev !== backup.entryFingerprint.dev || restored.ino === backup.entryFingerprint.ino || (restored.mode & 4095) !== (backup.entryFingerprint.mode & 4095) || Math.abs(restored.atimeMs - backup.entryFingerprint.atimeMs) > 1 || Math.abs(restored.mtimeMs - backup.entryFingerprint.mtimeMs) > 1 : restored.dev !== backup.entryFingerprint.dev || restored.ino !== backup.entryFingerprint.ino))) {
    throw new Error("restored file does not match its backup");
  } else if (backup.entryFingerprint.kind === "directory" && (restored.kind !== "directory" || (restored.mode & 4095) !== (backup.entryFingerprint.mode & 4095))) {
    throw new Error("restored directory does not match its backup");
  }
}
async function restoreDirectory(sourcePath, destinationPath, mode) {
  await mkdir4(destinationPath, { mode: mode & 4095 });
  for (const entry of await readdir3(sourcePath)) {
    await cp2(join3(sourcePath, entry), join3(destinationPath, entry), {
      recursive: true,
      errorOnExist: true,
      force: false,
      preserveTimestamps: true,
      verbatimSymlinks: true
    });
  }
  await chmod4(destinationPath, mode & 4095);
}
async function assertBackupAuthenticated(backup) {
  const container = await fingerprintPath2(backup.containerPath);
  const entry = await fingerprintPath2(backup.entryPath);
  const entries = await readdir3(backup.containerPath);
  if (!samePathFingerprint(container, backup.containerFingerprint) || container.kind !== "directory" || !samePathFingerprint(entry, backup.entryFingerprint) || entries.length !== 1 || entries[0] !== basename(backup.entryPath)) {
    throw new Error("backup authentication failed");
  }
}
async function removeAuthenticatedBackup(backup) {
  await assertBackupAuthenticated(backup);
  const cleanupPath = `${backup.containerPath}.remove-${randomUUID3()}`;
  await rename3(backup.containerPath, cleanupPath);
  const movedContainer = await fingerprintPath2(cleanupPath);
  const movedEntry = await fingerprintPath2(join3(cleanupPath, basename(backup.entryPath)));
  if (!samePathFingerprint(movedContainer, backup.containerFingerprint) || !samePathFingerprint(movedEntry, backup.entryFingerprint)) {
    try {
      await rename3(cleanupPath, backup.containerPath);
    } catch {
    }
    throw new Error("backup changed during removal");
  }
  await rm6(cleanupPath, { recursive: true });
}
async function removeCreatedRelease(releasePath, releasesRoot, created, uuid) {
  const current = await fingerprintPath2(releasePath);
  const marker = await readNoFollowInstallMarker(join3(releasePath, INSTALL_MARKER_NAME2));
  await canonicalExistingReleasePath(releasePath, releasesRoot);
  if (!samePathFingerprint(current, created.fingerprint) || marker === null || !sameInstallMarker(marker, created.marker)) {
    throw new Error("created release changed before rollback");
  }
  const cleanupPath = `${releasePath}.rollback-${uuid}`;
  await rename3(releasePath, cleanupPath);
  const moved = await fingerprintPath2(cleanupPath);
  const movedMarker = await readNoFollowInstallMarker(join3(cleanupPath, INSTALL_MARKER_NAME2));
  if (!samePathFingerprint(moved, created.fingerprint) || movedMarker === null || !sameInstallMarker(movedMarker, created.marker)) {
    try {
      await rename3(cleanupPath, releasePath);
    } catch {
    }
    throw new Error("created release changed during rollback");
  }
  await rm6(cleanupPath, { recursive: true });
}
async function fingerprintPath2(path4) {
  const before = await lstat4(path4);
  const kind = pathKind(before);
  const linkTarget = kind === "symlink" ? await readlink2(path4) : null;
  const after = await lstat4(path4);
  if (before.dev !== after.dev || before.ino !== after.ino || before.mode !== after.mode || pathKind(after) !== kind) {
    throw new Error("path changed during inspection");
  }
  return {
    dev: after.dev,
    ino: after.ino,
    mode: after.mode,
    atimeMs: after.atimeMs,
    mtimeMs: after.mtimeMs,
    kind,
    linkTarget
  };
}
function pathKind(pathStat) {
  if (pathStat.isSymbolicLink()) {
    return "symlink";
  }
  if (pathStat.isFile()) {
    return "file";
  }
  if (pathStat.isDirectory()) {
    return "directory";
  }
  return "other";
}
async function assertPathFingerprint(path4, expected) {
  const current = await fingerprintPath2(path4);
  if (!samePathFingerprint(current, expected)) {
    throw new Error("path changed before mutation");
  }
}
function samePathFingerprint(first, second) {
  return first.dev === second.dev && first.ino === second.ino && first.mode === second.mode && first.kind === second.kind && first.linkTarget === second.linkTarget;
}
function isErrorCode2(error, code) {
  return error?.code === code;
}

// dist/skills/store.js
function resolveStorePaths(homeDir, spec, sha256, uuid) {
  const skillsRoot = join4(homeDir, ".agents", "skills");
  const clinkRoot = join4(skillsRoot, ".clink");
  const releasesRoot = join4(clinkRoot, "releases");
  return {
    skillsRoot,
    clinkRoot,
    stagingPath: join4(clinkRoot, "staging", uuid),
    releasesRoot,
    releasePath: join4(releasesRoot, spec.publisher, spec.skillName, sha256),
    backupsRoot: join4(clinkRoot, "backups"),
    currentPath: join4(skillsRoot, spec.skillName)
  };
}

// dist/skills/install.js
var PENDING_SHA_SENTINEL = "pending";
var MIN_SKILL_DOWNLOAD_TIMEOUT_MS = 5 * 6e4;
var DEFAULT_DEPENDENCIES2 = {
  getTicket: getSkillDownloadTicket,
  downloadPackage: downloadSkillPackage,
  materializePackage: extractSkillPackage,
  reportPublicDownload: reportSkillPublicDownload,
  publishRelease: publishSkillRelease,
  detectAgentRoots: detectAgents,
  prepareAgents: prepareAgentPlans,
  randomUUID: createRandomUUID,
  now: () => /* @__PURE__ */ new Date(),
  remove: async (path4) => rm7(path4, { recursive: true, force: true }),
  log: (message) => {
    process.stderr.write(`${message}
`);
  }
};
async function installSkill(input, overrides = {}) {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES2,
    ...overrides
  };
  const packageSpec = toPackageSpec(input);
  const skillsRoot = join5(input.homeDir, ".agents", "skills");
  const installPath = join5(skillsRoot, input.skillName);
  const downloadTimeoutMs = Math.max(input.timeoutMs, MIN_SKILL_DOWNLOAD_TIMEOUT_MS);
  if (input.dryRun) {
    const detectedAgents = await dependencies.detectAgentRoots({
      homeDir: input.homeDir,
      env: input.env,
      skillsRoot,
      skillName: input.skillName
    });
    return {
      publisher: input.publisher,
      skillName: input.skillName,
      requestedVersion: input.requestedVersion,
      action: "planned",
      installPath,
      sizeBytes: null,
      sha256: null,
      backupPath: null,
      agents: detectedAgents.map(toDryRunAgentResult),
      dryRun: true
    };
  }
  const stagingUuid = dependencies.randomUUID();
  const preliminaryPaths = resolveStorePaths(input.homeDir, packageSpec, PENDING_SHA_SENTINEL, stagingUuid);
  const publishedSkills = [];
  const appliedAgents = [];
  let committed = false;
  let finalCleanupStarted = false;
  try {
    await mkdir5(preliminaryPaths.stagingPath, { recursive: true, mode: 448 });
    dependencies.log("Resolving skill download URL");
    const ticket = await dependencies.getTicket({
      baseUrl: input.dashboardBaseUrl,
      packageSpec,
      timeoutMs: input.timeoutMs
    });
    dependencies.log("Downloading skill package");
    const downloaded = await dependencies.downloadPackage({
      ticket,
      destinationPath: join5(preliminaryPaths.stagingPath, "package"),
      timeoutMs: downloadTimeoutMs,
      refreshTicket: () => dependencies.getTicket({
        baseUrl: input.dashboardBaseUrl,
        packageSpec,
        timeoutMs: input.timeoutMs
      })
    });
    dependencies.log("Materializing skill package");
    const extracted = await dependencies.materializePackage(downloaded.path, join5(preliminaryPaths.stagingPath, "extract"));
    const installUnits = await prepareInstallUnits(input, extracted, downloaded, stagingUuid, dependencies.now(), dependencies);
    dependencies.log("Publishing skill release");
    for (const unit of installUnits) {
      unit.published = await dependencies.publishRelease({
        paths: unit.paths,
        extractedRoot: unit.skillRoot,
        marker: unit.marker,
        force: input.force,
        uuid: unit.publicationUuid
      });
      publishedSkills.push(unit.published);
    }
    dependencies.log("Updating detected agents");
    for (const unit of installUnits) {
      if (unit.published === null) {
        throw new Error("skill publication is missing");
      }
      if (!unit.agentsPrepared) {
        await prepareUnitAgents(unit, input, dependencies);
      }
      for (const plan of unit.agentPlans) {
        const result2 = await plan.apply({
          releasePath: unit.published.releasePath,
          marker: unit.marker
        });
        appliedAgents.push(plan);
        unit.agentResults.push(result2);
      }
    }
    for (const plan of appliedAgents) {
      await plan.finalize();
    }
    for (const published of publishedSkills) {
      await published.finalize();
    }
    committed = true;
    const result = createInstallResult(input, downloaded, extracted.layout, skillsRoot, installUnits);
    finalCleanupStarted = true;
    await cleanupStaging(preliminaryPaths.stagingPath, dependencies);
    await reportPublicDownloadIfAvailable(input, ticket, dependencies);
    return result;
  } catch (error) {
    if (!committed) {
      await rollbackInstall(appliedAgents, publishedSkills, error);
    }
    if (!finalCleanupStarted) {
      await cleanupStaging(preliminaryPaths.stagingPath, dependencies, error);
    }
    throw error;
  }
}
async function prepareInstallUnits(input, extracted, downloaded, stagingUuid, installedAt, dependencies) {
  const skillsRoot = join5(input.homeDir, ".agents", "skills");
  const roots = extracted.layout === "single" ? [{ skillName: input.skillName, skillRoot: extracted.skillRoot }] : extracted.skillRoots;
  const units = [];
  for (const [index, root] of roots.entries()) {
    const spec = {
      publisher: input.publisher,
      skillName: root.skillName,
      requestedVersion: input.requestedVersion
    };
    const paths = resolveStorePaths(input.homeDir, spec, downloaded.sha256, stagingUuid);
    const detected = await dependencies.detectAgentRoots({
      homeDir: input.homeDir,
      env: input.env,
      skillsRoot,
      skillName: root.skillName
    });
    const unit = {
      skillName: root.skillName,
      skillRoot: root.skillRoot,
      paths,
      marker: createInstallMarker(input, downloaded, installedAt, root.skillName),
      detectedAgents: detected,
      agentUuid: dependencies.randomUUID(),
      agentPlans: [],
      agentsPrepared: false,
      agentResults: [],
      publicationUuid: dependencies.randomUUID(),
      published: null
    };
    if (index === 0) {
      await prepareUnitAgents(unit, input, dependencies);
    }
    units.push(unit);
  }
  return units;
}
async function prepareUnitAgents(unit, input, dependencies) {
  unit.agentPlans = await dependencies.prepareAgents({
    detected: unit.detectedAgents,
    currentPath: unit.paths.currentPath,
    publisher: input.publisher,
    skillName: unit.skillName,
    force: input.force,
    backupsRoot: unit.paths.backupsRoot,
    uuid: unit.agentUuid
  });
  unit.agentsPrepared = true;
}
function createInstallResult(input, downloaded, layout, skillsRoot, units) {
  if (layout === "single") {
    const unit = units[0];
    if (unit?.published === null || unit?.published === void 0) {
      throw new Error("skill publication is missing");
    }
    return {
      publisher: input.publisher,
      skillName: input.skillName,
      requestedVersion: input.requestedVersion,
      action: unit.published.action,
      installPath: unit.published.currentPath,
      sizeBytes: downloaded.sizeBytes,
      sha256: downloaded.sha256,
      backupPath: unit.published.backupPath,
      agents: unit.agentResults
    };
  }
  const skills = units.map((unit) => {
    if (unit.published === null) {
      throw new Error("skill publication is missing");
    }
    return {
      skillName: unit.skillName,
      action: unit.published.action,
      installPath: unit.published.currentPath,
      backupPath: unit.published.backupPath,
      agents: unit.agentResults
    };
  });
  return {
    publisher: input.publisher,
    skillName: input.skillName,
    requestedVersion: input.requestedVersion,
    action: aggregateInstallAction(skills),
    installPath: skillsRoot,
    sizeBytes: downloaded.sizeBytes,
    sha256: downloaded.sha256,
    multiSkill: true,
    skills
  };
}
function aggregateInstallAction(skills) {
  if (skills.every((skill) => skill.action === "unchanged")) {
    return "unchanged";
  }
  if (skills.some((skill) => skill.action === "updated")) {
    return "updated";
  }
  return "installed";
}
async function reportPublicDownloadIfAvailable(input, ticket, dependencies) {
  if (ticket.skillId === void 0) {
    return;
  }
  try {
    await dependencies.reportPublicDownload({
      dashboardBaseUrl: input.dashboardBaseUrl,
      skillId: ticket.skillId,
      timeoutMs: input.timeoutMs
    });
  } catch {
  }
}
function toPackageSpec(input) {
  return {
    publisher: input.publisher,
    skillName: input.skillName,
    requestedVersion: input.requestedVersion
  };
}
function toDryRunAgentResult(agent) {
  const status = agent.mode === "link" ? "linked" : agent.mode === "copy" ? "copied" : agent.mode === "shared" ? "shared" : "unsupported";
  return {
    agent: agent.agent,
    status,
    path: agent.targetPath,
    ...status === "unsupported" ? { reason: "local skill directory is not supported" } : {}
  };
}
function createInstallMarker(input, downloaded, installedAt, skillName = input.skillName) {
  return {
    schemaVersion: 1,
    publisher: input.publisher,
    skillName,
    requestedVersion: input.requestedVersion,
    sha256: downloaded.sha256,
    sizeBytes: downloaded.sizeBytes,
    installedAt: installedAt.toISOString()
  };
}
async function rollbackInstall(appliedAgents, publishedSkills, primaryError) {
  let rollbackError;
  for (const plan of [...appliedAgents].reverse()) {
    try {
      await plan.rollback();
    } catch (error) {
      rollbackError ??= error;
    }
  }
  for (const published of [...publishedSkills].reverse()) {
    try {
      await published.rollback();
    } catch (error) {
      rollbackError ??= error;
    }
  }
  if (primaryError === void 0 && rollbackError !== void 0) {
    throw rollbackError;
  }
}
async function cleanupStaging(stagingPath, dependencies, primaryError) {
  let retainedError = primaryError;
  try {
    await dependencies.remove(stagingPath);
  } catch (error) {
    retainedError ??= error;
  }
  if (retainedError !== void 0) {
    throw retainedError;
  }
}

// dist/skills/tip.js
var TERMINAL_PAYMENT_FAILURE_STATUSES = /* @__PURE__ */ new Set([3, 4, 6]);
async function resolveSkillTipRecipient(input, request = requestPublicSkillsJson) {
  const { publisher, skillName, requestedVersion } = input.target;
  const body = await request({
    baseUrl: input.dashboardBaseUrl,
    path: PUBLIC_SKILLS_MARKETPLACE_PATH,
    query: {
      publisher,
      q: skillName,
      ...requestedVersion ? { versionNo: requestedVersion } : {},
      pageSize: 999,
      sort: "NEW"
    },
    timeoutMs: input.timeoutMs
  });
  const items = selectPublicSkillItems(body);
  if (!items) {
    throw apiError("invalid public skills response", 502);
  }
  const matches = items.filter((item) => equalIdentity(item.publisher, publisher) && equalIdentity(item.name, skillName) && (requestedVersion === void 0 || stringValue2(item.versionNo).trim() === requestedVersion));
  if (matches.length === 0) {
    throw apiError(requestedVersion ? `skill version not found: ${publisher}/${skillName}@${requestedVersion}` : `skill not found: ${publisher}/${skillName}`, 404);
  }
  const uniqueRecipients = new Set(matches.map((item) => `${stringValue2(item.skillId)}\0${stringValue2(item.versionNo).trim()}\0${stringValue2(item.merchantId).trim()}`));
  if (uniqueRecipients.size !== 1) {
    throw apiError(`skill lookup is ambiguous: ${publisher}/${skillName}`, 409);
  }
  return recipientFromItem(matches[0], { publisher, skillName });
}
async function executeSkillTip(args, runtime, dependencies) {
  if (!Number.isFinite(args.amount) || args.amount < 1 || args.amount > 100) {
    throw validationError("skills tip amount must be between 1 and 100 USD");
  }
  if (runtime.dryRun) {
    return {
      status: "planned",
      publisher: args.target.publisher,
      skillName: args.target.skillName,
      ...args.target.requestedVersion ? { versionNo: args.target.requestedVersion } : {},
      amount: args.amount,
      currency: "USD",
      dryRun: true
    };
  }
  const recipient = await dependencies.resolveRecipient({
    dashboardBaseUrl: runtime.dashboardBaseUrl,
    target: args.target,
    timeoutMs: runtime.timeoutMs
  });
  const paymentMethod = selectDefaultTipPaymentMethod(await dependencies.refreshPaymentMethods(), args.amount);
  const execution = await dependencies.executeCharge({
    mode: "direct",
    paymentInstrumentId: paymentMethod.paymentInstrumentId,
    paymentMethodType: paymentMethod.paymentMethodType,
    merchantId: recipient.merchantId,
    amount: args.amount,
    currency: "USD"
  }, runtime.chargeRuntime);
  if (execution.dryRun) {
    throw new Error("charge dry-run is unreachable after tip lookup");
  }
  const status = execution.requires3ds ? "three_ds_required" : execution.status === 1 ? "paid" : execution.status !== void 0 && TERMINAL_PAYMENT_FAILURE_STATUSES.has(execution.status) ? "payment_failed" : "payment_unknown";
  const rawPaymentMessage = channelPaymentMessage(execution.data);
  const orderId = paymentOrderId(execution.data);
  if (status === "paid" && orderId !== void 0) {
    try {
      await dependencies.reportTip({
        dashboardBaseUrl: runtime.dashboardBaseUrl,
        skillId: recipient.skillId,
        timeoutMs: runtime.timeoutMs,
        orderId,
        ...recipient.versionNo ? { versionNo: recipient.versionNo } : {},
        amount: args.amount,
        currency: "USD"
      });
    } catch {
    }
  }
  return {
    status,
    publisher: recipient.publisher,
    skillName: recipient.skillName,
    skillId: recipient.skillId,
    ...recipient.versionNo ? { versionNo: recipient.versionNo } : {},
    merchantId: recipient.merchantId,
    amount: args.amount,
    currency: "USD",
    paymentInstrumentId: paymentMethod.paymentInstrumentId,
    authorization: "bypassed",
    payment: execution.data,
    rawPaymentStatus: execution.status ?? null,
    ...rawPaymentMessage ? { rawPaymentMessage } : {},
    ...execution.paymentMethodsRefreshWarning ? { paymentMethodsRefreshWarning: execution.paymentMethodsRefreshWarning } : {},
    ...execution.requires3ds ? { requires3ds: true } : {},
    ...execution.redirectUrl ? { redirectUrl: execution.redirectUrl } : {}
  };
}
function selectDefaultTipPaymentMethod(paymentMethods, amount) {
  const paymentMethod = paymentMethods.find((method) => method.isDefault === true);
  if (paymentMethod === void 0) {
    throw apiError("No default payment method", 422);
  }
  const paymentMethodType = normalizedUppercase(paymentMethod.paymentMethodType);
  if (paymentMethodType === "CARD") {
    return {
      paymentInstrumentId: paymentMethod.paymentInstrumentId,
      paymentMethodType
    };
  }
  if (paymentMethodType !== "BALANCE") {
    throw apiError("Unsupported default payment method", 422);
  }
  const availableBalance = paymentMethod.availableBalance;
  if (typeof availableBalance !== "number" || !Number.isFinite(availableBalance) || availableBalance < amount) {
    throw apiError("Credit \u4F59\u989D\u4E0D\u8DB3\uFF0C\u8BF7\u5148\u7ED1\u5B9A\u94F6\u884C\u5361", 402);
  }
  return {
    paymentInstrumentId: paymentMethod.paymentInstrumentId,
    paymentMethodType
  };
}
function recipientFromItem(item, errorIdentity) {
  const publisher = stringValue2(item.publisher).trim();
  const skillName = stringValue2(item.name).trim();
  if (!isValidSkillTipIdentitySegment(publisher) || !isValidSkillTipIdentitySegment(skillName)) {
    throw apiError("invalid public skills response", 502);
  }
  const merchantId = stringValue2(item.merchantId).trim();
  if (!merchantId) {
    throw apiError(`tips are unavailable because ${errorIdentity.publisher}/${errorIdentity.skillName} has no valid merchant ID`, 422);
  }
  const skillId = stringValue2(item.skillId).trim();
  if (!skillId) {
    throw apiError("invalid public skills response", 502);
  }
  const versionNo = stringValue2(item.versionNo).trim();
  return {
    publisher,
    skillName,
    skillId,
    ...versionNo ? { versionNo } : {},
    merchantId
  };
}
function paymentOrderId(data) {
  const paySuccessInfo = isRecord10(data.paySuccessInfo) ? data.paySuccessInfo : {};
  const orderId = stringValue2(paySuccessInfo.orderId).trim();
  return orderId || void 0;
}
function channelPaymentMessage(data) {
  const channel = isRecord10(data.channelPaymentResponse) ? data.channelPaymentResponse : {};
  for (const key of ["message", "msg", "errorMessage", "error_message", "error"]) {
    const message = stringValue2(channel[key]).trim();
    if (message) {
      return message;
    }
  }
  return void 0;
}
function stringValue2(value) {
  return typeof value === "string" ? value : "";
}
function normalizedUppercase(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}
function isRecord10(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function equalIdentity(value, expected) {
  return typeof value === "string" && value.trim().toLowerCase() === expected.trim().toLowerCase();
}

// dist/tool.js
import { execFile as execFile2 } from "node:child_process";
import { resolveCname as nodeResolveCname } from "node:dns/promises";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile2);
var DEFAULT_SITE_TIMEOUT_MS = 1e4;
var DEFAULT_RESOURCE_TIMEOUT_MS = 3e4;
var BROWSER_LAUNCH_TIMEOUT_MS = 3e4;
var BROWSER_CHANNELS = ["chrome", "msedge"];
var CHECKOUT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
var CnameLookupTimeoutError = class extends Error {
  constructor(timeoutMs) {
    super(`request timed out after ${timeoutMs}ms`);
    this.name = "CnameLookupTimeoutError";
  }
};
async function resolveSiteTypeFromUrl(rawUrl, options2 = {}) {
  return (await resolveSiteTypeDetailsFromUrl(rawUrl, options2)).result;
}
async function resolveSiteTypeDetailsFromUrl(rawUrl, options2) {
  const url = parseUrl(rawUrl);
  const hostname = normalizeHostname(url.hostname);
  if (isMyShopifyHost(hostname)) {
    return {
      result: siteTypeResult("shopify", "myshopify_domain")
    };
  }
  if (isEats365Host(hostname)) {
    return {
      result: siteTypeResult("eats365", "eats365pos_domain")
    };
  }
  let siteStatus;
  let finalUrl;
  try {
    const fetchSite = options2.fetchSite ?? ((siteUrl) => fetchSiteHeaders(siteUrl, options2.timeoutMs, options2.fetchPage));
    const site = normalizeSiteFetchResult(await fetchSite(buildHttpsOriginUrl(url)));
    siteStatus = site.status;
    finalUrl = site.url;
    if (hasShopifyPoweredByHeader(site.headers)) {
      return siteTypeResolveDetails("shopify", "powered_by_header", finalUrl);
    }
  } catch {
  }
  const resolveCname = options2.resolveCname ?? nodeResolveCname;
  const cnameDeadline = createCnameLookupDeadline(options2.timeoutMs, DEFAULT_SITE_TIMEOUT_MS);
  if (await hasShopifyCname(hostname, resolveCname, { deadline: cnameDeadline })) {
    return siteTypeResolveDetails("shopify", "cname", finalUrl);
  }
  if (siteStatus === 429) {
    throw networkError("site_detection_rate_limited");
  }
  return siteTypeResolveDetails("unknown", "unknown", finalUrl);
}
async function resolveCheckoutTotalFromUrl(rawUrl, options2 = {}) {
  const url = parseUrl(rawUrl);
  const fetchHtml = options2.fetchHtml ?? ((siteUrl) => fetchCheckoutHtml(siteUrl, options2.timeoutMs, options2.fetchPage));
  const html = await fetchHtml(url.toString());
  const serializedGraphql = getMetaContent(html, "serialized-graphql");
  if (!serializedGraphql) {
    throw validationError("checkout_state_not_found");
  }
  const checkoutState = parseSerializedGraphql(serializedGraphql);
  const candidates = collectCheckoutTotalCandidates(checkoutState);
  if (candidates.length === 0) {
    throw validationError("checkout_total_not_found");
  }
  const unique = dedupeCheckoutTotals(candidates);
  if (unique.length > 1) {
    throw validationError("ambiguous_checkout_total");
  }
  const total = unique[0];
  if (!total) {
    throw validationError("checkout_total_not_found");
  }
  return {
    amount: total.amount,
    currency: total.currency,
    source: total.source
  };
}
var EATS365_MANUAL_ITEM_FIELDS = [
  "itemId",
  "title",
  "unitPrice",
  "quantity",
  "currency",
  "merchantUrl",
  "merchantName",
  "merchantCategoryCode"
];
async function resolveParseItemFromUrl(rawUrl, options2 = {}) {
  const siteType = await resolveSiteTypeDetailsFromUrl(rawUrl, options2);
  if (siteType.result.site_type === "eats365") {
    throw validationError("EATS365_MANUAL_ITEM_REQUIRED");
  }
  if (siteType.result.site_type !== "shopify") {
    throw validationError("unkonw site type");
  }
  const canonicalItemUrl = await resolveCanonicalShopifyItemUrl(rawUrl, options2, siteType.finalUrl);
  const productJsonUrl = buildShopifyProductJsonUrl(canonicalItemUrl);
  let browserSession;
  const timeoutMs = options2.timeoutMs ?? DEFAULT_RESOURCE_TIMEOUT_MS;
  const fetchDirectJson = options2.fetchDirectJson ?? ((url) => fetchJsonResourceWithFetch(url, timeoutMs));
  const fetchJson = options2.fetchJson ?? (async (url) => {
    if (!browserSession) {
      try {
        return await fetchDirectJson(url);
      } catch (error) {
        if (!shouldUseBrowserFallback(error)) {
          throw error;
        }
        const createBrowserSession = options2.createBrowserJsonSession ?? createInstalledBrowserJsonSession;
        try {
          browserSession = await createBrowserSession(canonicalItemUrl, timeoutMs);
        } catch (browserError) {
          if (browserError instanceof CliError && browserError.type === "install_error") {
            throw installError(`${error.message}; ${browserError.message}`);
          }
          throw browserError;
        }
      }
    }
    return browserSession.fetchJson(url);
  });
  try {
    const productJson = await fetchJson(productJsonUrl);
    const currency = readCurrency(productJson) ?? readCurrency(await fetchJson(buildShopifyCartJsonUrl(canonicalItemUrl))) ?? "unknown";
    return parseShopifyProductItems(canonicalItemUrl, productJson, currency);
  } finally {
    await browserSession?.close().catch(() => void 0);
  }
}
async function resolveUcpProfileFromUrl(rawUrl, options2 = {}) {
  const url = parseUrl(rawUrl);
  const fetchJson = options2.fetchJsonIfOk ?? ((profileUrl) => fetchJsonResourceIfOk(profileUrl, options2.timeoutMs));
  const origin = buildHttpsOriginUrl(url);
  const profilePaths = ["/.well-known/ucp-clink", "/.well-known/ucp"];
  for (const profilePath of profilePaths) {
    const profile = await fetchJson(`${origin}${profilePath}`);
    if (profile !== void 0) {
      return profile;
    }
  }
  throw validationError("NO_UCP_SITE");
}
async function resolveUcpRestEndpointFromUrl(rawUrl) {
  const url = parseUrl(rawUrl);
  const provider = resolveUcpProviderFromHostname(url.hostname);
  if (!provider) {
    throw validationError("NO_UCP_REST_ENDPOINT");
  }
  return {
    endpoint: "",
    provider
  };
}
async function resolveUcpItemIdFromUrl(rawUrl, options2 = {}) {
  const url = parseUrl(rawUrl);
  const hostname = normalizeHostname(url.hostname);
  if (isMyShopifyHost(hostname)) {
    return shopifyResult(url, "myshopify_domain");
  }
  const resolveCname = options2.resolveCname ?? nodeResolveCname;
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
function siteTypeResult(siteType, strategy) {
  return {
    site_type: siteType,
    strategy
  };
}
function siteTypeResolveDetails(siteType, strategy, finalUrl) {
  return {
    result: siteTypeResult(siteType, strategy),
    ...finalUrl ? { finalUrl } : {}
  };
}
function isMyShopifyHost(hostname) {
  return hostname === "myshopify.com" || hostname.endsWith(".myshopify.com");
}
function isEats365Host(hostname) {
  return hostname === "eats365pos.com" || hostname.endsWith(".eats365pos.com");
}
function buildHttpsOriginUrl(url) {
  return `https://${url.host}`;
}
function buildShopifyProductJsonUrl(rawUrl) {
  const url = parseUrl(rawUrl);
  url.search = "";
  url.hash = "";
  url.pathname = appendJsonExtension(url.pathname);
  return url.toString();
}
function buildShopifyCartJsonUrl(rawUrl) {
  const url = parseUrl(rawUrl);
  url.search = "";
  url.hash = "";
  url.pathname = "/cart.js";
  return url.toString();
}
async function resolveCanonicalShopifyItemUrl(rawUrl, options2, finalSiteUrl) {
  const itemUrl = parseUrl(rawUrl);
  const itemHostname = normalizeHostname(itemUrl.hostname);
  if (isMyShopifyHost(itemHostname)) {
    return itemUrl.toString();
  }
  const resolveCname = options2.resolveCname ?? nodeResolveCname;
  const redirectedOrigin = parseRedirectedOrigin(finalSiteUrl);
  if (redirectedOrigin) {
    const redirectCnameDeadline = createCnameLookupDeadline(options2.timeoutMs, DEFAULT_RESOURCE_TIMEOUT_MS);
    if (await replaceWithValidatedShopifyOrigin(itemUrl, redirectedOrigin, resolveCname, redirectCnameDeadline)) {
      return itemUrl.toString();
    }
  }
  const fetchProfile = options2.fetchProfileJsonIfOk ?? ((profileUrl) => fetchJsonResourceIfOk(profileUrl, options2.timeoutMs));
  let profile;
  try {
    profile = await fetchProfile(`${buildHttpsOriginUrl(itemUrl)}/.well-known/ucp`);
  } catch {
    return itemUrl.toString();
  }
  const merchantCnameDeadline = createCnameLookupDeadline(options2.timeoutMs, DEFAULT_RESOURCE_TIMEOUT_MS);
  for (const merchantOrigin of readShopifyMerchantOrigins(profile)) {
    const canonicalOrigin = parseMerchantOrigin(merchantOrigin);
    if (!canonicalOrigin) {
      continue;
    }
    if (normalizeHostname(canonicalOrigin.hostname) === itemHostname) {
      itemUrl.protocol = "https:";
      itemUrl.host = canonicalOrigin.host;
      return itemUrl.toString();
    }
    if (await replaceWithValidatedShopifyOrigin(itemUrl, canonicalOrigin, resolveCname, merchantCnameDeadline)) {
      return itemUrl.toString();
    }
  }
  return itemUrl.toString();
}
function parseRedirectedOrigin(value) {
  if (!value) {
    return void 0;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return void 0;
    }
    return new URL(url.origin);
  } catch {
    return void 0;
  }
}
async function replaceWithValidatedShopifyOrigin(itemUrl, candidateOrigin, resolveCname, deadline) {
  const itemHostname = normalizeHostname(itemUrl.hostname);
  const candidateHostname = normalizeHostname(candidateOrigin.hostname);
  if (candidateHostname === itemHostname) {
    return false;
  }
  if (!isMyShopifyHost(candidateHostname) && !await hasShopifyCname(candidateHostname, resolveCname, { deadline })) {
    return false;
  }
  itemUrl.protocol = "https:";
  itemUrl.host = candidateOrigin.host;
  return true;
}
function readShopifyMerchantOrigins(profile) {
  if (!isRecord11(profile)) {
    return [];
  }
  const ucp = isRecord11(profile.ucp) ? profile.ucp : profile;
  const paymentHandlers = isRecord11(ucp.payment_handlers) ? ucp.payment_handlers : isRecord11(ucp.paymentHandlers) ? ucp.paymentHandlers : void 0;
  if (!paymentHandlers) {
    return [];
  }
  const origins = [];
  const seenOrigins = /* @__PURE__ */ new Set();
  for (const handlers of Object.values(paymentHandlers)) {
    if (!Array.isArray(handlers)) {
      continue;
    }
    for (const handler of handlers) {
      if (!isRecord11(handler) || !isRecord11(handler.config)) {
        continue;
      }
      const merchantInfo = isRecord11(handler.config.merchant_info) ? handler.config.merchant_info : isRecord11(handler.config.merchantInfo) ? handler.config.merchantInfo : void 0;
      const merchantOrigin = merchantInfo ? asTrimmedString(merchantInfo.merchant_origin) ?? asTrimmedString(merchantInfo.merchantOrigin) : void 0;
      if (merchantOrigin && !seenOrigins.has(merchantOrigin)) {
        seenOrigins.add(merchantOrigin);
        origins.push(merchantOrigin);
      }
    }
  }
  return origins;
}
function parseMerchantOrigin(value) {
  if (!value) {
    return void 0;
  }
  try {
    const origin = new URL(/^[a-z][a-z0-9+.-]*:\/\//iu.test(value) ? value : `https://${value}`);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.port || origin.pathname !== "/" && origin.pathname !== "" || origin.search || origin.hash) {
      return void 0;
    }
    return origin;
  } catch {
    return void 0;
  }
}
function appendJsonExtension(pathname) {
  const trimmed = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (!trimmed || trimmed === ".js" || trimmed.endsWith(".js")) {
    return trimmed || "/.js";
  }
  return `${trimmed}.js`;
}
function normalizeSiteFetchResult(result) {
  if (result instanceof Headers) {
    return {
      status: 200,
      headers: result
    };
  }
  return result;
}
async function fetchSiteHeaders(url, timeoutMs = 1e4, fetchPage = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchPage(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US",
        "User-Agent": CHECKOUT_USER_AGENT
      },
      signal: controller.signal
    });
    return {
      status: response.status,
      headers: response.headers,
      ...response.url ? { url: response.url } : {}
    };
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchJsonResourceWithFetch(url, timeoutMs = DEFAULT_RESOURCE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US",
        "User-Agent": CHECKOUT_USER_AGENT
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      const retryAfterSuffix = retryAfter ? ` (retry-after: ${retryAfter})` : "";
      throw new CliError("network_error", `request failed with status ${response.status}${retryAfterSuffix}`, EXIT_CODES.NETWORK, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "CliError") {
      throw error;
    }
    if (error.name === "AbortError") {
      throw networkError(`request timed out after ${timeoutMs}ms`);
    }
    throw networkError(error.message);
  } finally {
    clearTimeout(timeout);
  }
}
function shouldUseBrowserFallback(error) {
  return error instanceof CliError && error.type === "network_error" && error.code === 429;
}
async function createInstalledBrowserJsonSession(itemUrl, requestTimeoutMs, createChannelSession = createPlaywrightBrowserChannelSession) {
  let lastError;
  for (const channel of BROWSER_CHANNELS) {
    try {
      const session = await createChannelSession(channel, itemUrl, requestTimeoutMs, BROWSER_LAUNCH_TIMEOUT_MS);
      if (session) {
        return session;
      }
    } catch (error) {
      lastError = normalizeBrowserLaunchError(error, channel, BROWSER_LAUNCH_TIMEOUT_MS);
    }
  }
  if (lastError) {
    throw lastError;
  }
  throw installError("browser fallback unavailable: Google Chrome and Microsoft Edge are not installed; install Google Chrome and retry");
}
async function createPlaywrightBrowserChannelSession(channel, itemUrl, requestTimeoutMs, launchTimeoutMs) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw installError("browser fallback unavailable: install Google Chrome and retry");
  }
  let browser;
  try {
    browser = await chromium.launch({
      channel,
      headless: true,
      timeout: launchTimeoutMs
    });
  } catch (error) {
    if (isMissingBrowserExecutableError(error)) {
      return void 0;
    }
    throw error;
  }
  const launchedBrowser = browser;
  try {
    const page = await launchedBrowser.newPage();
    const response = await page.goto(itemUrl, {
      waitUntil: "domcontentloaded",
      timeout: requestTimeoutMs
    });
    if (!response) {
      throw networkError("browser navigation returned no response");
    }
    if (!response.ok()) {
      throw networkError(`browser navigation failed with status ${response.status()}`);
    }
    return {
      fetchJson: (url) => fetchJsonResourceWithBrowser(page, url, requestTimeoutMs),
      close: () => launchedBrowser.close()
    };
  } catch (error) {
    await launchedBrowser.close().catch(() => void 0);
    throw normalizeBrowserError(error, requestTimeoutMs);
  }
}
function isMissingBrowserExecutableError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /distribution '[^']+' is not found|executable doesn't exist at/iu.test(message);
}
function normalizeBrowserLaunchError(error, channel, launchTimeoutMs) {
  if (error instanceof CliError) {
    return error;
  }
  const browserError = error;
  if (browserError.name === "TimeoutError") {
    return networkError(`${browserChannelName(channel)} launch timed out after ${launchTimeoutMs}ms`);
  }
  return networkError(`failed to launch ${browserChannelName(channel)}: ${browserError.message}`);
}
function browserChannelName(channel) {
  return channel === "chrome" ? "Google Chrome" : "Microsoft Edge";
}
async function fetchJsonResourceWithBrowser(page, url, timeoutMs) {
  let result;
  try {
    result = await page.evaluate(async ({ requestUrl, requestTimeoutMs }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetch(requestUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Accept-Language": "en-US"
          },
          credentials: "include",
          cache: "no-store",
          signal: controller.signal
        });
        return {
          kind: "response",
          status: response.status,
          text: await response.text(),
          retryAfter: response.headers.get("retry-after")
        };
      } catch (error) {
        return {
          kind: "error",
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error)
        };
      } finally {
        clearTimeout(timeout);
      }
    }, {
      requestUrl: url,
      requestTimeoutMs: timeoutMs
    });
  } catch (error) {
    throw normalizeBrowserError(error, timeoutMs);
  }
  if (result.kind === "error") {
    if (result.name === "AbortError") {
      throw networkError(`request timed out after ${timeoutMs}ms`);
    }
    throw networkError(result.message);
  }
  if (result.status < 200 || result.status >= 300) {
    const retryAfter = result.retryAfter ? ` (retry-after: ${result.retryAfter})` : "";
    throw networkError(`request failed with status ${result.status}${retryAfter}`);
  }
  try {
    return JSON.parse(result.text);
  } catch (error) {
    throw networkError(error.message);
  }
}
function normalizeBrowserError(error, timeoutMs) {
  if (error instanceof CliError) {
    return error;
  }
  const browserError = error;
  if (browserError.name === "TimeoutError") {
    return networkError(`request timed out after ${timeoutMs}ms`);
  }
  return networkError(browserError.message);
}
async function fetchJsonResourceIfOk(url, timeoutMs = 3e4) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US",
        "User-Agent": CHECKOUT_USER_AGENT
      },
      signal: controller.signal
    });
    if (!response.ok) {
      return void 0;
    }
    const rawText = await response.text();
    if (!rawText.trim()) {
      return void 0;
    }
    try {
      return JSON.parse(rawText);
    } catch {
      return void 0;
    }
  } catch {
    return void 0;
  } finally {
    clearTimeout(timeout);
  }
}
function hasShopifyPoweredByHeader(headers) {
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase() === "powered-by" && /shopify/i.test(value)) {
      return true;
    }
  }
  return false;
}
async function hasShopifyCname(hostname, resolveCname, options2 = {}) {
  const seen = options2.seen ?? /* @__PURE__ */ new Set();
  const normalized = normalizeHostname(hostname);
  if (seen.has(normalized) || seen.size >= 8) {
    return false;
  }
  seen.add(normalized);
  let cnames;
  try {
    cnames = await resolveCnameWithinDeadline(normalized, resolveCname, options2.deadline);
  } catch (error) {
    if (error instanceof CnameLookupTimeoutError) {
      throw networkError(error.message);
    }
    return false;
  }
  for (const cname of cnames.map(normalizeHostname)) {
    if (cname === "shops.myshopify.com") {
      return true;
    }
  }
  for (const cname of cnames) {
    if (await hasShopifyCname(cname, resolveCname, { ...options2, seen })) {
      return true;
    }
  }
  return false;
}
function createCnameLookupDeadline(timeoutMs, defaultTimeoutMs) {
  const effectiveTimeoutMs = timeoutMs ?? defaultTimeoutMs;
  return {
    expiresAt: Date.now() + effectiveTimeoutMs,
    timeoutMs: effectiveTimeoutMs
  };
}
async function resolveCnameWithinDeadline(hostname, resolveCname, deadline) {
  if (!deadline) {
    return resolveCname(hostname);
  }
  const remainingMs = deadline.expiresAt - Date.now();
  if (remainingMs <= 0) {
    throw new CnameLookupTimeoutError(deadline.timeoutMs);
  }
  let timeout;
  try {
    return await Promise.race([
      resolveCname(hostname),
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => reject(new CnameLookupTimeoutError(deadline.timeoutMs)), remainingMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
async function fetchCheckoutHtml(url, timeoutMs = 3e4, fetchPage) {
  if (!fetchPage) {
    try {
      return await fetchCheckoutHtmlWithCurl(url, timeoutMs);
    } catch (error) {
      if (!isCommandNotFound(error)) {
        throw error;
      }
    }
  }
  return fetchCheckoutHtmlWithFetch(url, timeoutMs, fetchPage ?? fetch);
}
async function fetchCheckoutHtmlWithCurl(url, timeoutMs) {
  try {
    const { stdout } = await execFileAsync("curl", [
      "-L",
      "--globoff",
      "--compressed",
      "--silent",
      "--show-error",
      "--cookie",
      "",
      "--max-time",
      String(Math.max(1, Math.ceil(timeoutMs / 1e3))),
      "-A",
      CHECKOUT_USER_AGENT,
      url
    ], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs + 1e3
    });
    return stdout;
  } catch (error) {
    if (isCommandNotFound(error)) {
      throw error;
    }
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    throw networkError(stderr || error.message);
  }
}
function isCommandNotFound(error) {
  return error.code === "ENOENT";
}
async function fetchCheckoutHtmlWithFetch(url, timeoutMs, fetchPage) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const cookies = [];
  let currentUrl = new URL(url);
  try {
    for (let redirectCount = 0; redirectCount <= 10; redirectCount += 1) {
      const headers = new Headers({
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US",
        "User-Agent": CHECKOUT_USER_AGENT
      });
      const cookieHeader = getCookieHeader(currentUrl, cookies);
      if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
      }
      const response = await fetchPage(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        headers,
        signal: controller.signal
      });
      storeResponseCookies(response.headers, currentUrl, cookies);
      if (isRedirectStatus(response.status)) {
        const location = response.headers.get("location");
        if (location) {
          currentUrl = new URL(location, currentUrl);
          continue;
        }
      }
      return await response.text();
    }
    throw networkError("too many redirects while fetching checkout page");
  } catch (error) {
    if (error instanceof Error && error.name === "CliError") {
      throw error;
    }
    if (error.name === "AbortError") {
      throw networkError(`request timed out after ${timeoutMs}ms`);
    }
    throw networkError(error.message);
  } finally {
    clearTimeout(timeout);
  }
}
function isRedirectStatus(status) {
  return status >= 300 && status < 400;
}
function storeResponseCookies(headers, url, cookies) {
  for (const header of getSetCookieHeaders(headers)) {
    const cookie = parseSetCookieHeader(header, url);
    if (!cookie) {
      continue;
    }
    const existingIndex = cookies.findIndex((stored) => stored.name === cookie.name && stored.domain === cookie.domain && stored.path === cookie.path);
    if (existingIndex >= 0) {
      cookies.splice(existingIndex, 1, cookie);
    } else {
      cookies.push(cookie);
    }
  }
}
function getSetCookieHeaders(headers) {
  const headersWithSetCookie = headers;
  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie();
  }
  const value = headers.get("set-cookie");
  return value ? splitSetCookieHeader(value) : [];
}
function splitSetCookieHeader(value) {
  const headers = [];
  let start = 0;
  let inExpiresAttribute = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value.slice(index, index + 8).toLowerCase() === "expires=") {
      inExpiresAttribute = true;
      index += 7;
      continue;
    }
    if (inExpiresAttribute && value[index] === ";") {
      inExpiresAttribute = false;
      continue;
    }
    if (!inExpiresAttribute && value[index] === ",") {
      headers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  headers.push(value.slice(start).trim());
  return headers.filter(Boolean);
}
function parseSetCookieHeader(header, url) {
  const parts = header.split(";").map((part) => part.trim());
  const [nameValue, ...attributes] = parts;
  if (!nameValue) {
    return void 0;
  }
  const separator = nameValue.indexOf("=");
  if (separator <= 0) {
    return void 0;
  }
  const name = nameValue.slice(0, separator);
  const value = nameValue.slice(separator + 1);
  let domain = url.hostname.toLowerCase();
  let hostOnly = true;
  let path4 = defaultCookiePath(url.pathname);
  for (const attribute of attributes) {
    const attributeSeparator = attribute.indexOf("=");
    const attributeName = (attributeSeparator >= 0 ? attribute.slice(0, attributeSeparator) : attribute).toLowerCase();
    const attributeValue = attributeSeparator >= 0 ? attribute.slice(attributeSeparator + 1) : "";
    if (attributeName === "domain" && attributeValue) {
      domain = attributeValue.trim().toLowerCase().replace(/^\./, "");
      hostOnly = false;
    } else if (attributeName === "path" && attributeValue.startsWith("/")) {
      path4 = attributeValue;
    }
  }
  return {
    name,
    value,
    domain,
    hostOnly,
    path: path4
  };
}
function defaultCookiePath(pathname) {
  if (!pathname || pathname[0] !== "/") {
    return "/";
  }
  const lastSlash = pathname.lastIndexOf("/");
  return lastSlash <= 0 ? "/" : pathname.slice(0, lastSlash);
}
function getCookieHeader(url, cookies) {
  return cookies.filter((cookie) => cookieMatchesUrl(cookie, url)).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}
function cookieMatchesUrl(cookie, url) {
  const hostname = url.hostname.toLowerCase();
  const domainMatches = cookie.hostOnly ? hostname === cookie.domain : hostname === cookie.domain || hostname.endsWith(`.${cookie.domain}`);
  return domainMatches && url.pathname.startsWith(cookie.path);
}
function getMetaContent(html, name) {
  const targetName = name.toLowerCase();
  const lowerHtml = html.toLowerCase();
  let offset = 0;
  while (offset < html.length) {
    const start = lowerHtml.indexOf("<meta", offset);
    if (start === -1) {
      return void 0;
    }
    const afterName = lowerHtml[start + 5];
    if (afterName && !isHtmlNameBoundary(afterName)) {
      offset = start + 5;
      continue;
    }
    const end = findTagEnd(html, start);
    if (end === -1) {
      return void 0;
    }
    const attributes = parseHtmlAttributes(html.slice(start + 5, end));
    if (attributes.get("name")?.toLowerCase() === targetName) {
      return attributes.get("content");
    }
    offset = end + 1;
  }
  return void 0;
}
function isHtmlNameBoundary(value) {
  return /\s|\/|>/.test(value);
}
function findTagEnd(html, start) {
  let quote;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (quote) {
      if (char === quote) {
        quote = void 0;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") {
      return index;
    }
  }
  return -1;
}
function parseHtmlAttributes(value) {
  const attributes = /* @__PURE__ */ new Map();
  let index = 0;
  while (index < value.length) {
    while (index < value.length && isAttributeWhitespace(value[index])) {
      index += 1;
    }
    if (index >= value.length || value[index] === "/") {
      break;
    }
    const nameStart = index;
    while (index < value.length && !isAttributeNameEnd(value[index])) {
      index += 1;
    }
    const attributeName = value.slice(nameStart, index).toLowerCase();
    if (!attributeName) {
      index += 1;
      continue;
    }
    while (index < value.length && isAttributeWhitespace(value[index])) {
      index += 1;
    }
    let attributeValue = "";
    if (value[index] === "=") {
      index += 1;
      while (index < value.length && isAttributeWhitespace(value[index])) {
        index += 1;
      }
      const quote = value[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        const valueStart = index;
        while (index < value.length && value[index] !== quote) {
          index += 1;
        }
        attributeValue = value.slice(valueStart, index);
        if (value[index] === quote) {
          index += 1;
        }
      } else {
        const valueStart = index;
        while (index < value.length && !isAttributeWhitespace(value[index])) {
          index += 1;
        }
        attributeValue = value.slice(valueStart, index);
      }
    }
    attributes.set(attributeName, decodeHtmlEntities(attributeValue));
  }
  return attributes;
}
function isAttributeWhitespace(value) {
  return value === " " || value === "\n" || value === "\r" || value === "	" || value === "\f";
}
function isAttributeNameEnd(value) {
  return value === void 0 || value === "=" || value === "/" || isAttributeWhitespace(value);
}
function decodeHtmlEntities(value) {
  return value.replace(/&(#\d+|#x[0-9a-fA-F]+|quot|amp|lt|gt|apos);/g, (_match, entity) => {
    if (entity[0] === "#") {
      const codePoint = entity[1]?.toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
    }
    switch (entity) {
      case "quot":
        return '"';
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "apos":
        return "'";
      default:
        return _match;
    }
  });
}
function parseSerializedGraphql(value) {
  try {
    return JSON.parse(value);
  } catch {
    throw validationError("checkout_state_invalid");
  }
}
function collectCheckoutTotalCandidates(value) {
  const candidates = [];
  collectCheckoutTotalCandidatesInto(value, candidates);
  return candidates;
}
function collectCheckoutTotalCandidatesInto(value, candidates) {
  if (!isRecord11(value)) {
    return;
  }
  const result = readPath(value, ["session", "negotiate", "result"]);
  if (isRecord11(result)) {
    collectProposalTotal(result.buyerProposal, "serialized-graphql.buyerProposal.runningTotal", candidates);
    collectProposalTotal(result.sellerProposal, "serialized-graphql.sellerProposal.runningTotal", candidates);
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        collectCheckoutTotalCandidatesInto(item, candidates);
      }
    } else {
      collectCheckoutTotalCandidatesInto(child, candidates);
    }
  }
}
function collectProposalTotal(proposal, source, candidates) {
  const runningTotal = readPath(proposal, ["runningTotal", "value"]);
  if (!isRecord11(runningTotal)) {
    return;
  }
  const amount = runningTotal.amount;
  const currencyCode = runningTotal.currencyCode;
  if (typeof amount !== "string" || !amount.trim() || typeof currencyCode !== "string" || !currencyCode.trim()) {
    return;
  }
  candidates.push({
    amount,
    currency: currencyCode,
    source,
    key: `${amount}\0${currencyCode}`
  });
}
function dedupeCheckoutTotals(candidates) {
  const unique = /* @__PURE__ */ new Map();
  for (const candidate of candidates) {
    if (!unique.has(candidate.key)) {
      unique.set(candidate.key, candidate);
    }
  }
  return [...unique.values()];
}
function parseShopifyProductItems(rawUrl, productJson, currency) {
  if (!isRecord11(productJson)) {
    throw validationError("shopify_product_invalid");
  }
  const itemUrl = buildCanonicalItemUrl(rawUrl);
  const itemUrlObject = parseUrl(itemUrl);
  const merchantDomain = normalizeHostname(itemUrlObject.hostname);
  const merchantName = asTrimmedString(productJson.vendor) ?? merchantDomain;
  const optionNames = readShopifyOptionNames(productJson);
  const variants = Array.isArray(productJson.variants) ? productJson.variants : [];
  if (variants.length === 0) {
    throw validationError("shopify_product_variants_not_found");
  }
  return {
    itemUrl,
    merchantOrigin: itemUrlObject.origin,
    merchantDomain,
    merchantName,
    currency,
    items: variants.map((variant) => parseShopifyVariantItem(variant, productJson, currency, itemUrl, optionNames))
  };
}
function parseShopifyVariantItem(variant, productJson, currency, canonicalItemUrl, optionNames) {
  if (!isRecord11(variant)) {
    throw validationError("shopify_product_variant_invalid");
  }
  const variantId = asIdString(variant.id);
  if (!variantId) {
    throw validationError("shopify_variant_id_not_found");
  }
  const productTitle = asTrimmedString(productJson.title) ?? "unknown";
  const title = asTrimmedString(variant.name) ?? asTrimmedString(variant.title) ?? productTitle;
  const availability = readAvailability(variant);
  return {
    itemId: variantId,
    title,
    unitPriceMinor: parseUnitPriceMinor(variant.price),
    available: availability,
    itemUrl: buildVariantItemUrl(canonicalItemUrl, variantId),
    options: readShopifyVariantOptions(variant, optionNames),
    inventoryStatus: resolveInventoryStatus(availability)
  };
}
function buildCanonicalItemUrl(rawUrl) {
  const url = parseUrl(rawUrl);
  url.search = "";
  url.hash = "";
  return url.toString();
}
function buildVariantItemUrl(rawUrl, variantId) {
  const url = parseUrl(rawUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("variant", variantId);
  return url.toString();
}
function readShopifyOptionNames(productJson) {
  const options2 = Array.isArray(productJson.options) ? productJson.options : [];
  return options2.map((option, index) => {
    if (!isRecord11(option)) {
      return `option${index + 1}`;
    }
    return asTrimmedString(option.name) ?? `option${index + 1}`;
  });
}
function readShopifyVariantOptions(variant, optionNames) {
  const options2 = {};
  for (let index = 0; index < 3; index += 1) {
    const value = asTrimmedString(variant[`option${index + 1}`]);
    if (!value) {
      continue;
    }
    options2[optionNames[index] ?? `option${index + 1}`] = value;
  }
  return options2;
}
function readCurrency(value) {
  if (!isRecord11(value)) {
    return void 0;
  }
  return asTrimmedString(value.currency) ?? asTrimmedString(value.currencyCode);
}
function readAvailability(variant) {
  const quantity = variant.inventory_quantity ?? variant.inventoryQuantity;
  if (typeof quantity === "number" && Number.isFinite(quantity)) {
    return quantity > 0;
  }
  if (typeof quantity === "string" && quantity.trim() && Number.isFinite(Number(quantity))) {
    return Number(quantity) > 0;
  }
  if (typeof variant.available === "boolean") {
    return variant.available;
  }
  return null;
}
function resolveInventoryStatus(available) {
  if (available === true) {
    return "in_stock";
  }
  if (available === false) {
    return "out_of_stock";
  }
  return "unknown";
}
function parseUnitPriceMinor(value) {
  const minorUnits = parseMinorUnits(value);
  if (minorUnits === void 0 || minorUnits < 0n || minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw validationError("shopify_variant_price_not_found");
  }
  return Number(minorUnits);
}
function parseMinorUnits(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  return void 0;
}
function asIdString(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  return void 0;
}
function asTrimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function readPath(value, path4) {
  let current = value;
  for (const key of path4) {
    if (!isRecord11(current)) {
      return void 0;
    }
    current = current[key];
  }
  return current;
}
function isRecord11(value) {
  return typeof value === "object" && value !== null;
}
function resolveUcpProviderFromHostname(hostname) {
  const normalized = normalizeHostname(hostname);
  if (normalized === "clinkbill.com" || normalized.endsWith(".clinkbill.com")) {
    return "clinkbill";
  }
  return void 0;
}
function normalizeHostname(value) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

// dist/ucp-checkout-wait.js
var DEFAULT_POLL_INTERVAL_MS2 = 3e3;
var MAX_POLL_INTERVAL_MS = 3e4;
var TERMINAL_STATUSES = /* @__PURE__ */ new Set([
  "completed",
  "cancelled",
  "canceled",
  "expired",
  "failed",
  "rejected",
  "requires_escalation"
]);
var realSleep2 = (milliseconds) => new Promise((resolve4) => setTimeout(resolve4, milliseconds));
async function waitForUcpCheckoutTerminal(options2) {
  const now = options2.now ?? Date.now;
  const sleep3 = options2.sleep ?? realSleep2;
  const deadline = now() + options2.maxWaitMs;
  let attempts = 0;
  while (true) {
    const checkout = requireCheckout(options2.checkoutId, await options2.fetchCheckout());
    attempts += 1;
    const status = checkoutStatus(checkout);
    const nextRetryAt = normalizedRetryAt(checkout.next_retry_at ?? checkout.nextRetryAt);
    if (TERMINAL_STATUSES.has(status)) {
      return {
        checkout,
        status,
        attempts,
        timedOut: false,
        ...nextRetryAt ? { nextRetryAt } : {}
      };
    }
    const currentTime = now();
    if (currentTime >= deadline) {
      return {
        checkout,
        status,
        attempts,
        timedOut: true,
        ...nextRetryAt ? { nextRetryAt } : {}
      };
    }
    await sleep3(Math.min(resolvePollDelayMs(nextRetryAt, currentTime), deadline - currentTime));
  }
}
function requireCheckout(checkoutId, value) {
  if (!isRecord12(value)) {
    throw apiError("UCP Checkout response must be an object.");
  }
  const observedId = normalizedText(value.id ?? value.checkoutId ?? value.checkout_id);
  if (!observedId) {
    throw apiError("UCP Checkout response is missing id.");
  }
  if (observedId !== checkoutId) {
    throw apiError("UCP Checkout response id does not match the requested Checkout.");
  }
  return value;
}
function checkoutStatus(checkout) {
  return normalizedText(checkout.status)?.toLowerCase() ?? "unknown";
}
function normalizedRetryAt(value) {
  const text = normalizedText(value);
  if (!text) {
    return void 0;
  }
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : void 0;
}
function resolvePollDelayMs(nextRetryAt, now) {
  if (!nextRetryAt) {
    return DEFAULT_POLL_INTERVAL_MS2;
  }
  const delay = Date.parse(nextRetryAt) - now;
  if (!Number.isFinite(delay)) {
    return DEFAULT_POLL_INTERVAL_MS2;
  }
  return Math.min(MAX_POLL_INTERVAL_MS, Math.max(DEFAULT_POLL_INTERVAL_MS2, delay));
}
function normalizedText(value) {
  return typeof value === "string" && value.trim() ? value.normalize("NFKC").trim() : void 0;
}
function isRecord12(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/ucp-order.js
var DEFAULT_POLL_INTERVAL_MS3 = 3e3;
var MAX_POLL_INTERVAL_MS2 = 3e4;
var PENDING_DELIVERY_STATUSES = /* @__PURE__ */ new Set(["pending", "syncing", "retryable"]);
var realSleep3 = (milliseconds) => new Promise((resolve4) => setTimeout(resolve4, milliseconds));
async function waitForUcpDigitalDelivery(options2) {
  const now = options2.now ?? Date.now;
  const sleep3 = options2.sleep ?? realSleep3;
  const deadline = now() + options2.maxWaitMs;
  let attempts = 0;
  while (true) {
    const order = requireOrder(options2.orderId, await options2.fetchOrder());
    attempts += 1;
    const delivery = classifyUcpDigitalDelivery(order);
    if (delivery.status === "ready" || delivery.status === "failed") {
      return {
        ready: delivery.status === "ready",
        timedOut: false,
        deliveryStatus: delivery.status,
        attempts,
        order,
        ...delivery.nextRetryAt ? { nextRetryAt: delivery.nextRetryAt } : {}
      };
    }
    const currentTime = now();
    if (currentTime >= deadline) {
      return {
        ready: false,
        timedOut: true,
        deliveryStatus: "pending",
        attempts,
        order,
        ...delivery.nextRetryAt ? { nextRetryAt: delivery.nextRetryAt } : {}
      };
    }
    const delayMs = Math.min(resolvePollDelayMs2(delivery.nextRetryAt, currentTime), deadline - currentTime);
    await sleep3(delayMs);
  }
}
function classifyUcpDigitalDelivery(order) {
  const rawDelivery = order.digital_delivery;
  if (rawDelivery === void 0 || rawDelivery === null) {
    return { status: "pending" };
  }
  if (!isRecord13(rawDelivery)) {
    throw apiError("UCP order digital_delivery must be an object.");
  }
  const rawStatus = rawDelivery.status;
  if (typeof rawStatus !== "string" || !rawStatus.trim()) {
    throw apiError("UCP order digital_delivery.status is missing.");
  }
  const status = rawStatus.trim().toLowerCase();
  const nextRetryAt = normalizedRetryAt2(rawDelivery.next_retry_at);
  if (status === "ready") {
    if (!Array.isArray(rawDelivery.artifacts) || rawDelivery.artifacts.length === 0) {
      throw apiError("UCP order digital delivery is ready without artifacts.");
    }
    return { status: "ready" };
  }
  if (status === "failed") {
    return { status: "failed" };
  }
  if (PENDING_DELIVERY_STATUSES.has(status)) {
    return {
      status: "pending",
      ...nextRetryAt ? { nextRetryAt } : {}
    };
  }
  throw apiError(`unsupported UCP digital delivery status: ${status}`);
}
function requireOrder(orderId, value) {
  if (!isRecord13(value)) {
    throw apiError("UCP order response must be an object.");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw apiError("UCP order response is missing id.");
  }
  if (value.id.trim() !== orderId) {
    throw apiError("UCP order response id does not match the requested order.");
  }
  return value;
}
function normalizedRetryAt2(value) {
  if (typeof value !== "string" || !value.trim()) {
    return void 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : void 0;
}
function resolvePollDelayMs2(nextRetryAt, now) {
  if (!nextRetryAt) {
    return DEFAULT_POLL_INTERVAL_MS3;
  }
  const delay = Date.parse(nextRetryAt) - now;
  if (!Number.isFinite(delay)) {
    return DEFAULT_POLL_INTERVAL_MS3;
  }
  return Math.min(MAX_POLL_INTERVAL_MS2, Math.max(DEFAULT_POLL_INTERVAL_MS3, delay));
}
function isRecord13(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/cli.js
var INSTRUCTION_PATH2 = "/agent/cwallet/instructions";
var CARD_SETUP_PATH = "/payment-method-setup";
var CARD_MANAGEMENT_PATH = "/payment-method-modify";
var INSTRUCTION_STATUSES = /* @__PURE__ */ new Set([
  "CREATED",
  "ACTIVE",
  "PENDING",
  "INPROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "DECLINED"
]);
var UCP_EXTERNAL_CHECKOUT_PATH = "/agent/ucp/external/checkout-sessions";
var EXTRA_CATALOG_SEARCH_PATH = "/agent/ucp/extra/catalog/search";
var UCP_ORDER_PATH = "/agent/ucp/orders";
var UCP_ORDER_STATUSES = /* @__PURE__ */ new Set([
  "draft",
  "pending",
  "paid",
  "cancelled",
  "partially_refunded",
  "refunded"
]);
var DEFAULT_UCP_DELIVERY_WAIT_SECONDS = 900;
var DEFAULT_UCP_AGENT = "clink-cli";
var OAUTH_OPERATION_VALIDITY_BUFFER_MS = 3e4;
var UCP_MERCHANT_LIST_FLAGS = /* @__PURE__ */ new Set([
  "internal",
  "sandbox",
  "test",
  "timeout",
  "format",
  "help"
]);
var BASE_COMMAND_NAMES = /* @__PURE__ */ new Set([
  "wallet",
  "card",
  "risk",
  "skills",
  "pay",
  "refund",
  "ucp-checkout",
  "ucp-catalog",
  "ucp-merchant",
  "catalog",
  "ucp-order",
  "instruction",
  "events",
  "tool",
  "config"
]);
function printContextHelp(context, command, subcommand, nestedCommand) {
  printHelp(command, subcommand, nestedCommand, context.executableName);
}
async function runCli(argv, startedAt = performance.timeOrigin + performance.now(), edition = {}) {
  const args = parseArgs(argv, edition.parseArgsOptions);
  const [command, subcommand, nestedCommand] = args.positionals;
  edition.validateArgs?.(command, subcommand, args.flags);
  validateUcpMerchantListSelector(command, subcommand, args.positionals, args.flags);
  const selectedCommandEnvironment = validateEnvironmentFlagScope(command, subcommand, nestedCommand, args.flags, edition.environmentSelectingInitCommands ?? [], edition.environmentSelectingCommands ?? []);
  validateCatalogLanguageFlagScope(command, subcommand, args.flags);
  validateEventPollSelector(command, subcommand, args.flags);
  validateUcpCheckoutRunPurchaseConfirmation(command, subcommand, args.flags);
  const editionCommandNames = new Set(edition.commandNames ?? []);
  if (getBooleanFlag(args.flags, "help")) {
    if (command && !BASE_COMMAND_NAMES.has(command) && !editionCommandNames.has(command)) {
      throw validationError(`unsupported command: ${command}`);
    }
    process.stdout.write((edition.getHelpText ?? getHelpText)(command, subcommand, nestedCommand));
    return EXIT_CODES.OK;
  }
  if (!command) {
    process.stdout.write((edition.getHelpText ?? getHelpText)());
    return EXIT_CODES.OK;
  }
  const preparedCommand = await edition.prepareCommand?.(command, subcommand, args);
  const usesPublicCatalogEnvironment = isPublicCatalogEnvironmentCommand(command, subcommand, nestedCommand);
  const storedConfig = usesPublicCatalogEnvironment ? defaultConfig() : await readStoredConfig();
  const runtimeConfig = usesPublicCatalogEnvironment ? {
    baseUrl: resolvePublicCatalogBaseUrl(args.flags),
    defaultOpenLinks: false
  } : resolveRuntimeConfig(storedConfig, args.flags);
  if (selectedCommandEnvironment) {
    runtimeConfig.baseUrl = API_BASE_URLS[selectedCommandEnvironment];
  }
  const globalOptions = resolveGlobalOptions(args, storedConfig);
  const context = {
    args,
    ...preparedCommand !== void 0 ? { preparedCommand } : {},
    storedConfig,
    runtimeConfig,
    authorizationIdentity: runtimeAuthorizationIdentity(runtimeConfig),
    globalOptions,
    startedAt,
    oauthScope: edition.oauthScope ?? OAUTH_DEFAULT_SCOPE,
    executableName: edition.executableName ?? MAIN_EXECUTABLE_NAME,
    configLifecycle: edition.configLifecycle ?? {}
  };
  await prepareOAuthAuthorization(command, subcommand, context, edition);
  switch (command) {
    case "wallet":
      return handleWalletCommand(subcommand, context);
    case "card":
      return handleCardCommand(subcommand, context);
    case "risk":
      return handleRiskRuleCommand(subcommand, context);
    case "skills":
      return handleSkillsCommand(subcommand, context);
    case "pay":
      return handlePayCommand(context);
    case "refund":
      return handleRefundCommand(subcommand, context);
    case "ucp-checkout":
      return handleUcpCheckoutCommand(subcommand, context);
    case "ucp-catalog":
      return handleUcpCatalogCommand(subcommand, context);
    case "ucp-merchant":
      return handleUcpMerchantCommand(subcommand, context);
    case "catalog":
      return handleCatalogCommand(subcommand, context);
    case "ucp-order":
      return handleUcpOrderCommand(subcommand, context);
    case "instruction":
      return handleInstructionCommand(subcommand, context);
    case "events":
      return handleEventsCommand(subcommand, context);
    case "tool":
      return handleToolCommand(subcommand, context);
    case "config":
      return handleConfigCommand(subcommand, context);
  }
  const editionExitCode = await edition.handleCommand?.(command, subcommand, context);
  if (editionExitCode !== void 0) {
    return editionExitCode;
  }
  throw validationError(`unsupported command: ${command}`);
}
function validateUcpMerchantListSelector(command, subcommand, positionals, flags) {
  const isMerchantList = command === "ucp-merchant" && subcommand === "list";
  if ("internal" in flags && !isMerchantList) {
    throw validationError("--internal is only supported by ucp-merchant list");
  }
  if (!isMerchantList) {
    return;
  }
  const unsupportedFlag = Object.keys(flags).find((name) => !UCP_MERCHANT_LIST_FLAGS.has(name));
  if (unsupportedFlag) {
    throw validationError(`--${unsupportedFlag} is not supported by ucp-merchant list`);
  }
  if (positionals.length !== 2) {
    throw validationError("ucp-merchant list does not accept positional arguments");
  }
  if (!getBooleanFlag(flags, "help") && !getBooleanFlag(flags, "internal")) {
    throw validationError("ucp-merchant list requires --internal");
  }
}
function validateEventPollSelector(command, subcommand, flags) {
  if (command !== "events" || subcommand !== "poll") {
    return;
  }
  if ("checkout-id" in flags && !getStringFlag(flags, "checkout-id")?.trim()) {
    throw validationError("invalid --checkout-id: expected a non-blank id");
  }
  if ("payment-instrument-id" in flags && !getStringFlag(flags, "payment-instrument-id")?.trim()) {
    throw validationError("invalid --payment-instrument-id: expected a non-blank id");
  }
  const type = parseEventTypeFlag(getStringFlag(flags, "type"));
  if ("checkout-id" in flags && type !== "agent_order.succeeded" && type !== "agent_order.failed") {
    throw validationError("--checkout-id requires --type agent_order.succeeded or --type agent_order.failed");
  }
  if ("payment-instrument-id" in flags && !type) {
    throw validationError("--payment-instrument-id requires --type");
  }
  if ("checkout-id" in flags && "payment-instrument-id" in flags) {
    throw validationError("--checkout-id and --payment-instrument-id are mutually exclusive");
  }
}
function validateUcpCheckoutRunPurchaseConfirmation(command, subcommand, flags) {
  if (command === "ucp-checkout" && subcommand === "run" && !getBooleanFlag(flags, "help") && !getBooleanFlag(flags, "dry-run") && !getBooleanFlag(flags, "confirm-purchase")) {
    throw validationError("ucp-checkout run requires explicit --confirm-purchase before any live request");
  }
}
function validateEnvironmentFlagScope(command, subcommand, nestedCommand, flags, editionInitCommands, editionCommands) {
  if (isPublicCatalogEnvironmentCommand(command, subcommand, nestedCommand)) {
    resolvePublicCatalogBaseUrl(flags);
    return void 0;
  }
  const environmentCommands = [
    { command: "wallet", subcommand: "init" },
    ...editionInitCommands.map((name) => ({ command: name, subcommand: "init" })),
    ...editionCommands
  ];
  const selectedCommand = environmentCommands.find((candidate) => command === candidate.command && subcommand === candidate.subcommand);
  const sandbox = getBooleanFlag(flags, "sandbox");
  const test = getBooleanFlag(flags, "test");
  if (selectedCommand) {
    return resolveSelectedEnvironment(flags);
  }
  const publicCatalogCommands = [
    "ucp-catalog search",
    "ucp-catalog product",
    "catalog search",
    "ucp-merchant list",
    "tool internal-ucp get-merchant-list"
  ];
  const supportedBy = environmentCommands.map(({ command: name, subcommand: action }) => `${name} ${action}`).concat(publicCatalogCommands).join(" or ");
  if (!selectedCommand && sandbox) {
    throw validationError(`--sandbox is only supported by ${supportedBy}`);
  }
  if (!selectedCommand && test) {
    throw validationError(`--test is only supported by ${supportedBy}`);
  }
  return void 0;
}
function validateCatalogLanguageFlagScope(command, subcommand, flags) {
  if (!("language" in flags)) {
    return;
  }
  const supported = command === "ucp-catalog" && (subcommand === "search" || subcommand === "product") || command === "catalog" && subcommand === "search" || command === "visa" && subcommand === "product-search";
  if (!supported) {
    throw validationError("--language is only supported by ucp-catalog search, ucp-catalog product, catalog search, or visa product-search");
  }
}
function isPublicCatalogEnvironmentCommand(command, subcommand, nestedCommand) {
  return command === "ucp-catalog" && (subcommand === "search" || subcommand === "product") || command === "catalog" && subcommand === "search" || command === "ucp-merchant" && subcommand === "list" || command === "tool" && subcommand === "internal-ucp" && nestedCommand === "get-merchant-list";
}
async function handleUcpMerchantCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "ucp-merchant");
    return EXIT_CODES.OK;
  }
  if (subcommand !== "list") {
    throw validationError(`unsupported ucp-merchant command: ${subcommand}`);
  }
  rejectPublicCatalogAuthenticationFlags(context.args.flags);
  const environment = clinkEnvironmentForApiBaseUrl(context.runtimeConfig.baseUrl);
  if (!environment) {
    throw configError("invalid UCP merchant API environment");
  }
  const result = await getInternalUcpMerchantList({
    environment,
    timeoutMs: context.globalOptions.timeoutMs
  });
  printSuccess(result, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function handleSkillsCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "skills");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "list":
      return skillsList(context);
    case "install":
      return skillsInstall(context);
    case "tip":
      return skillsTip(context);
    default:
      throw validationError(`unsupported skills command: ${subcommand}`);
  }
}
async function skillsList(context) {
  if (!getBooleanFlag(context.args.flags, "all")) {
    throw validationError("skills list requires --all");
  }
  if (context.args.positionals.length !== 2) {
    throw validationError("skills list --all does not accept positional arguments");
  }
  const rows = await listAllPublicSkills({
    dashboardBaseUrl: resolveDashboardBaseUrl(context.runtimeConfig.baseUrl),
    timeoutMs: context.globalOptions.timeoutMs,
    tippableOnly: getBooleanFlag(context.args.flags, "tippable")
  });
  printSuccess(rows, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function skillsInstall(context) {
  const args = parseSkillInstallArgs(context.args.positionals.slice(2), context.args.flags);
  const result = await installSkill({
    ...args,
    baseUrl: context.runtimeConfig.baseUrl,
    dashboardBaseUrl: resolveDashboardBaseUrl(context.runtimeConfig.baseUrl),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun,
    homeDir: homedir(),
    env: process.env
  });
  printSuccess(result, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function skillsTip(context) {
  const args = parseSkillTipArgs(context.args.positionals.slice(2), context.args.flags);
  const paymentMethodApi = createPaymentMethodApi(context);
  const getRuntimeConfig = createRuntimeConfigLoader(context);
  const refreshRuntimeConfig = createRuntimeConfigRefresher(context);
  const result = await executeSkillTip(args, {
    baseUrl: context.runtimeConfig.baseUrl,
    dashboardBaseUrl: resolveDashboardBaseUrl(context.runtimeConfig.baseUrl),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun,
    chargeRuntime: {
      runtimeConfig: context.runtimeConfig,
      getRuntimeConfig,
      refreshRuntimeConfig,
      timeoutMs: context.globalOptions.timeoutMs,
      dryRun: context.globalOptions.dryRun,
      refreshPaymentMethods: paymentMethodApi.refreshPaymentMethods
    }
  }, {
    resolveRecipient: resolveSkillTipRecipient,
    refreshPaymentMethods: paymentMethodApi.refreshPaymentMethods,
    executeCharge,
    reportTip: reportSkillTip
  });
  const staleEventCutoffMs = Date.now();
  printSuccess(result, context.globalOptions.format);
  if (result.status === "three_ds_required" && result.redirectUrl) {
    await maybeWatchEvents(context, result.redirectUrl, "3-D Secure authentication", {
      staleEventCutoffMs
    });
    return EXIT_CODES.THREE_DS;
  }
  if (result.status === "payment_unknown") {
    return EXIT_CODES.NETWORK;
  }
  if (result.status === "payment_failed") {
    return EXIT_CODES.API;
  }
  return EXIT_CODES.OK;
}
async function prepareOAuthAuthorization(command, subcommand, context, edition) {
  if (context.globalOptions.dryRun || !context.storedConfig.authorization || !(commandUsesCustomerAuthorization(command, subcommand) || edition.commandUsesCustomerAuthorization?.(command, subcommand))) {
    return;
  }
  await refreshOAuthAuthorization(context);
}
async function refreshOAuthAuthorization(context, options2 = {}) {
  if (context.globalOptions.dryRun || !context.storedConfig.authorization) {
    return;
  }
  const previousAuthorization = context.storedConfig.authorization;
  const wasCustomerIdUnverified = !previousAuthorization.customerIdVerified;
  const refreshed = await ensureFreshOAuthAuthorization({
    storedConfig: context.storedConfig,
    runtimeBaseUrl: context.runtimeConfig.baseUrl,
    timeoutMs: context.globalOptions.timeoutMs,
    ...options2
  });
  context.storedConfig = refreshed;
  context.runtimeConfig = resolveRuntimeConfig(refreshed, context.args.flags);
  if (refreshed.authorization && (wasCustomerIdUnverified && refreshed.authorization.customerIdVerified || !previousAuthorization.sessionId && refreshed.authorization.sessionId)) {
    context.authorizationIdentity = runtimeAuthorizationIdentity(context.runtimeConfig);
  }
}
function createRuntimeConfigRefresher(context) {
  return async (failedAuthorization) => {
    await refreshOAuthAuthorization(context, { force: true, failedAuthorization });
    return context.runtimeConfig;
  };
}
function createRuntimeConfigLoader(context) {
  return async () => {
    const storedConfig = await readStoredConfig();
    const runtimeConfig = resolveRuntimeConfig(storedConfig, context.args.flags);
    const latestIdentity = runtimeAuthorizationIdentity(runtimeConfig);
    assertCommandAuthorizationUnchanged(context.authorizationIdentity, latestIdentity);
    if (context.authorizationIdentity.type === "csk" && latestIdentity.type === "oauth" || context.authorizationIdentity.type === "oauth" && !context.authorizationIdentity.sessionId && latestIdentity.type === "oauth" && Boolean(latestIdentity.sessionId)) {
      context.authorizationIdentity = latestIdentity;
    }
    context.storedConfig = storedConfig;
    context.runtimeConfig = runtimeConfig;
    return runtimeConfig;
  };
}
function createOAuthRequestRuntime(context) {
  const refreshRuntimeConfig = createRuntimeConfigRefresher(context);
  const getRuntimeConfig = createRuntimeConfigLoader(context);
  return {
    getRuntimeConfig,
    reloadRuntimeConfig: getRuntimeConfig,
    refreshRuntimeConfig
  };
}
function assertCommandAuthorizationUnchanged(original, latest) {
  if (authorizationIdentityCanContinue(original, latest)) {
    return;
  }
  throw authError("Authentication changed while the command was in progress; retry the command.");
}
async function requestOAuthBusinessJson(context, buildRequest) {
  return requestJsonWithOAuthRetry(createOAuthRequestRuntime(context), buildRequest);
}
async function requestOAuthBusinessJsonOnce(context, buildRequest) {
  const runtimeConfig = await createRuntimeConfigLoader(context)();
  return requestJson(buildRequest(runtimeConfig));
}
function commandUsesCustomerAuthorization(command, subcommand) {
  switch (command) {
    case "card":
      return subcommand === "binding-link" || subcommand === "setup-link" || subcommand === "modify-link" || subcommand === "passkey-link";
    case "risk":
      return subcommand === "get" || subcommand === "link";
    case "skills":
      return subcommand === "tip";
    case "pay":
      return true;
    case "refund":
    case "ucp-checkout":
    case "ucp-order":
    case "instruction":
    case "events":
      return subcommand !== void 0;
    default:
      return false;
  }
}
async function handleToolCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "tool");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "item-id":
      return toolItemId(context);
    case "parse-site":
      return toolParseSite(context);
    case "parse-item":
      return toolParseItem(context);
    case "checkout-total":
      return toolCheckoutTotal(context);
    case "get-ucp-profile":
      return toolGetUcpProfile(context);
    case "get-rest-endpoint":
      return toolGetRestEndpoint(context);
    case "internal-ucp":
      return toolInternalUcp(context);
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
async function toolParseSite(context) {
  const url = requireStringFlag(context.args.flags, "missing --url", "url");
  const result = await resolveSiteTypeFromUrl(url, { timeoutMs: context.globalOptions.timeoutMs });
  printSuccess(result, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function toolParseItem(context) {
  const url = requireStringFlag(context.args.flags, "missing --url", "url");
  try {
    const result = await resolveParseItemFromUrl(url, { timeoutMs: context.globalOptions.timeoutMs });
    printSuccess(result, context.globalOptions.format);
  } catch (error) {
    if (isEats365ManualItem(error)) {
      printSuccess({
        site_type: "eats365",
        resolution: "manual_item_facts",
        reason: "eats365 publishes no machine-readable product data for this URL",
        next_step: "Determine each field in required_fields from the conversation context, confirm them with the user, then pass them to ucp-checkout create",
        required_fields: [...EATS365_MANUAL_ITEM_FIELDS],
        // unitPrice maps to line_items[].item.price, which ucp-checkout create scales by
        // --currency. Passing minor units there would bill the customer 100x the agreed amount.
        checkout_mapping: {
          currency: "--currency",
          merchantUrl: "--merchant-url",
          merchantCategoryCode: "--merchant-category-code",
          line_items: `--line-items '[{"id":"li_1","item":{"id":"<itemId>","title":"<title>","price":"<unitPrice>"},"quantity":<quantity>}]'`
        },
        unit_price_format: 'unitPrice is a major-unit decimal string, for example "28.00" for 28 HKD. ucp-checkout create converts it to minor units by --currency, so never pass minor units',
        items: []
      }, context.globalOptions.format);
      return EXIT_CODES.OK;
    }
    if (isUnknownSiteType(error)) {
      printJson({ error_code: error.message }, context.globalOptions.format);
      return EXIT_CODES.OK;
    }
    throw error;
  }
  return EXIT_CODES.OK;
}
async function toolCheckoutTotal(context) {
  const url = requireStringFlag(context.args.flags, "missing --url", "url");
  try {
    const result = await resolveCheckoutTotalFromUrl(url, { timeoutMs: context.globalOptions.timeoutMs });
    printSuccess(result, context.globalOptions.format);
  } catch (error) {
    if (isCheckoutStateNotFound(error)) {
      printJson({ error_message: error.message }, context.globalOptions.format);
      return EXIT_CODES.OK;
    }
    throw error;
  }
  return EXIT_CODES.OK;
}
async function toolGetUcpProfile(context) {
  const url = requireStringFlag(context.args.flags, "missing --url", "url");
  try {
    const result = await resolveUcpProfileFromUrl(url, { timeoutMs: context.globalOptions.timeoutMs });
    printJson(result, context.globalOptions.format);
  } catch (error) {
    if (isNoUcpSite(error)) {
      printJson({ error_code: error.message }, context.globalOptions.format);
      return EXIT_CODES.OK;
    }
    throw error;
  }
  return EXIT_CODES.OK;
}
async function toolGetRestEndpoint(context) {
  const url = requireStringFlag(context.args.flags, "missing --url", "url");
  try {
    const result = await resolveUcpRestEndpointFromUrl(url);
    printJson(result, context.globalOptions.format);
  } catch (error) {
    if (isNoUcpRestEndpoint(error)) {
      printJson({ error_code: error.message }, context.globalOptions.format);
      return EXIT_CODES.OK;
    }
    throw error;
  }
  return EXIT_CODES.OK;
}
async function toolInternalUcp(context) {
  const nestedCommand = context.args.positionals[2];
  if (!nestedCommand) {
    printContextHelp(context, "tool", "internal-ucp");
    return EXIT_CODES.OK;
  }
  const baseUrl = context.runtimeConfig.baseUrl;
  const configuredEnvironment = clinkEnvironmentForApiBaseUrl(baseUrl);
  switch (nestedCommand) {
    case "get-merchant-list": {
      rejectPublicCatalogAuthenticationFlags(context.args.flags);
      if (!configuredEnvironment) {
        throw configError("configured base URL does not match production, sandbox, or test; run wallet init to select an environment");
      }
      const result = await getInternalUcpMerchantList({
        environment: configuredEnvironment,
        timeoutMs: context.globalOptions.timeoutMs
      });
      printJson({ merchants: result }, context.globalOptions.format);
      return EXIT_CODES.OK;
    }
    case "get-endpoint": {
      const productUrl = requireStringFlag(context.args.flags, "missing --product-url", "product-url");
      try {
        const result = await resolveInternalUcpEndpoint(productUrl, {
          baseUrl,
          environment: configuredEnvironment ?? "production",
          timeoutMs: context.globalOptions.timeoutMs
        });
        printJson(result, context.globalOptions.format);
      } catch (error) {
        if (error instanceof CliError && error.message === "NOT_IN_INTERNAL_UCP_LIST") {
          printJson({ error_code: error.message }, context.globalOptions.format);
          return EXIT_CODES.OK;
        }
        throw error;
      }
      return EXIT_CODES.OK;
    }
    default:
      throw validationError(`unsupported internal-ucp tool command: ${nestedCommand}`);
  }
}
function isCheckoutStateNotFound(error) {
  return error instanceof CliError && error.message === "checkout_state_not_found";
}
function isUnknownSiteType(error) {
  return error instanceof CliError && error.message === "unkonw site type";
}
function isEats365ManualItem(error) {
  return error instanceof CliError && error.message === "EATS365_MANUAL_ITEM_REQUIRED";
}
function isNoUcpSite(error) {
  return error instanceof CliError && error.message === "NO_UCP_SITE";
}
function isNoUcpRestEndpoint(error) {
  return error instanceof CliError && error.message === "NO_UCP_REST_ENDPOINT";
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
async function maybeWatchEvents(context, url, label, watchTarget = {}, onReady) {
  if (!context.globalOptions.watch || context.globalOptions.dryRun) {
    if (!context.globalOptions.watch && !context.globalOptions.dryRun) {
      printPendingWatchHandoff(url, watchTarget.eventType, context.executableName);
    }
    return;
  }
  await refreshOAuthAuthorization(context, {
    minimumValidityMs: DEFAULT_EVENT_WATCH_DURATION_MS + context.globalOptions.timeoutMs + OAUTH_OPERATION_VALIDITY_BUFFER_MS
  });
  const getRuntimeConfig = createRuntimeConfigLoader(context);
  const refreshRuntimeConfig = createRuntimeConfigRefresher(context);
  const result = await watchEvents({
    runtimeConfig: context.runtimeConfig,
    getRuntimeConfig,
    resolveStoredRuntimeConfig: (storedConfig) => resolveRuntimeConfig(storedConfig, context.args.flags),
    refreshRuntimeConfig,
    timeoutMs: context.globalOptions.timeoutMs,
    url,
    label,
    ...watchTarget,
    ...onReady ? { onReady } : {}
  });
  printSuccess(result, context.globalOptions.format);
}
function printPendingWatchHandoff(url, eventType, executableName) {
  if (!url || !eventType) {
    return;
  }
  process.stderr.write(`Watch not started (--no-watch). This link needs a listener before the user acts on it.
Run now: ${executableName} events poll --type ${eventType} --no-ack --format json
`);
}
async function handleEventsCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "events");
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
  const type = parseEventTypeFlag(getStringFlag(flags, "type"));
  const checkoutId = getStringFlag(flags, "checkout-id")?.trim();
  const ucpOrderId = getStringFlag(flags, "ucp-order-id")?.trim();
  const checkoutEndpoint = getStringFlag(flags, "endpoint")?.trim();
  const paymentInstrumentId = getStringFlag(flags, "payment-instrument-id")?.trim();
  const nextToken = getStringFlag(flags, "next-token")?.trim();
  const ack = !getBooleanFlag(flags, "no-ack");
  const eventOnly = getBooleanFlag(flags, "event-only");
  if ("checkout-id" in flags && !checkoutId) {
    throw validationError("invalid --checkout-id: expected a non-blank id");
  }
  if (checkoutId && type !== "agent_order.succeeded" && type !== "agent_order.failed") {
    throw validationError("--checkout-id requires --type agent_order.succeeded or --type agent_order.failed");
  }
  if ("ucp-order-id" in flags && !ucpOrderId) {
    throw validationError("invalid --ucp-order-id: expected a non-blank id");
  }
  if (ucpOrderId && (!checkoutId || type !== "agent_order.succeeded")) {
    throw validationError("--ucp-order-id requires --type agent_order.succeeded and --checkout-id");
  }
  if ("endpoint" in flags && !checkoutEndpoint) {
    throw validationError("invalid --endpoint: expected a non-blank absolute http(s) URL");
  }
  if (checkoutEndpoint) {
    if (!checkoutId || type !== "agent_order.succeeded") {
      throw validationError("--endpoint on events poll requires --type agent_order.succeeded and --checkout-id");
    }
    parseAbsoluteHttpUrl(checkoutEndpoint, "--endpoint");
  }
  if (eventOnly && (!checkoutId || type !== "agent_order.succeeded")) {
    throw validationError("--event-only requires --type agent_order.succeeded and --checkout-id");
  }
  if (eventOnly && ucpOrderId) {
    throw validationError("--event-only cannot be combined with --ucp-order-id");
  }
  if (checkoutId && paymentInstrumentId) {
    throw validationError("--checkout-id and --payment-instrument-id are mutually exclusive");
  }
  if (paymentInstrumentId && !type) {
    throw validationError("--payment-instrument-id requires --type");
  }
  if ("next-token" in flags && !nextToken) {
    throw validationError("invalid --next-token: expected a non-blank token");
  }
  if (nextToken && !checkoutId) {
    throw validationError("--next-token requires --checkout-id");
  }
  if (context.globalOptions.dryRun) {
    printSuccess({ ready: false, timedOut: false, events: [], ackedEventIds: [], dryRun: true }, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  const maxDurationMs = maxWaitSeconds !== void 0 ? maxWaitSeconds * 1e3 : DEFAULT_EVENT_COLLECT_DURATION_MS;
  await refreshOAuthAuthorization(context, {
    minimumValidityMs: maxDurationMs + context.globalOptions.timeoutMs + OAUTH_OPERATION_VALIDITY_BUFFER_MS
  });
  const getRuntimeConfig = createRuntimeConfigLoader(context);
  const refreshRuntimeConfig = createRuntimeConfigRefresher(context);
  const compositeOrderLookupCheckoutId = ack && !eventOnly && type === "agent_order.succeeded" ? checkoutId : void 0;
  const result = await collectWebhookEvents({
    runtimeConfig: context.runtimeConfig,
    getRuntimeConfig,
    resolveStoredRuntimeConfig: (storedConfig) => resolveRuntimeConfig(storedConfig, context.args.flags),
    refreshRuntimeConfig,
    timeoutMs: context.globalOptions.timeoutMs,
    // Keep the selected payment event recoverable while the read-only checkout/order lookup runs.
    // It is acknowledged immediately before output once the composite result is ready.
    ack: compositeOrderLookupCheckoutId !== void 0 ? false : ack,
    maxDurationMs,
    ...pageSize !== void 0 ? { pageSize } : {},
    ...type ? { type } : {},
    ...checkoutId ? { checkoutId } : {},
    ...paymentInstrumentId ? { expectedResource: { paymentInstrumentId } } : {},
    ...nextToken ? { nextToken } : {}
  });
  const shouldFetchUcpOrder = result.ready && compositeOrderLookupCheckoutId !== void 0;
  let orderLookup;
  if (result.ready && compositeOrderLookupCheckoutId !== void 0) {
    orderLookup = await fetchUcpOrderAfterPaymentEvent(context, compositeOrderLookupCheckoutId, ucpOrderId, checkoutEndpoint);
  }
  let ackedEventIds = result.ackedEventIds;
  let eventAckWarning;
  if (shouldFetchUcpOrder) {
    const selectedEventIds = result.events.map((event) => event.eventId).filter((eventId) => eventId.length > 0);
    try {
      ackedEventIds = await ackWebhookEvents({
        runtimeConfig: context.runtimeConfig,
        getRuntimeConfig,
        refreshRuntimeConfig,
        expectedIdentity: context.authorizationIdentity,
        timeoutMs: context.globalOptions.timeoutMs
      }, selectedEventIds);
    } catch (error) {
      rethrowPostPaymentAuthError(error);
      eventAckWarning = `Payment is confirmed, but the success event could not be acknowledged: ${postPaymentLookupError(error)}`;
    }
  }
  const pollOutput = {
    ready: result.ready,
    timedOut: result.timedOut,
    events: result.events,
    ackedEventIds,
    ...eventAckWarning ? { eventAckWarning } : {},
    ...result.nextToken ? { nextToken: result.nextToken } : {},
    ...result.timedOut ? {
      resumeCommand: buildResumeCommand(type, checkoutId, paymentInstrumentId, result.nextToken, ack, context.globalOptions.format, canonicalWalletOriginForResume(context.runtimeConfig.baseUrl), context.executableName, ucpOrderId, checkoutEndpoint, eventOnly)
    } : {}
  };
  printSuccess({
    ...pollOutput,
    ...orderLookup ?? {}
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function fetchUcpOrderAfterPaymentEvent(context, checkoutId, frozenUcpOrderId, checkoutEndpoint) {
  let ucpOrderId = frozenUcpOrderId;
  if (!ucpOrderId) {
    const checkoutResumeCommand = buildUcpCheckoutGetResumeCommand(checkoutId, checkoutEndpoint, context.globalOptions.format, canonicalWalletOriginForResume(context.runtimeConfig.baseUrl), context.executableName);
    const resolution = await resolveUcpOrderProjection({
      checkoutId,
      fetchCheckout: async () => {
        const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}`);
        const checkoutResult = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
          ...target,
          method: "GET",
          headers: buildCustomerApiKeyHeaders(runtimeConfig, target.baseUrl),
          timeoutMs: context.globalOptions.timeoutMs,
          dryRun: false
        }));
        if (isDryRun3(checkoutResult)) {
          throw apiError("ucp-checkout get unexpectedly returned a dry-run response");
        }
        assertApiSuccess(checkoutResult.status, checkoutResult.body);
        return unwrapApiData(checkoutResult.body);
      }
    });
    if (resolution.status !== "RESOLVED") {
      return {
        paymentConfirmed: true,
        orderLookupStatus: resolution.status,
        orderWarning: resolution.warning,
        orderResumeCommand: checkoutResumeCommand
      };
    }
    ucpOrderId = resolution.ucpOrderId;
  }
  const orderResumeCommand = buildUcpOrderGetResumeCommand(ucpOrderId, context.globalOptions.format, canonicalWalletOriginForResume(context.runtimeConfig.baseUrl), context.executableName);
  try {
    const orderResult = await requestUcpOrder(context, ucpOrderId);
    if (isDryRun3(orderResult)) {
      throw apiError("ucp-order get unexpectedly returned a dry-run response");
    }
    assertApiSuccess(orderResult.status, orderResult.body);
    const order = unwrapApiData(orderResult.body);
    const orderIdentity = resolveStrictIdentifierAliases([
      { name: "data.id", value: isJsonObject2(order) ? order.id : void 0 },
      { name: "data.orderId", value: isJsonObject2(order) ? order.orderId : void 0 },
      { name: "data.order_id", value: isJsonObject2(order) ? order.order_id : void 0 }
    ]);
    if (!isJsonObject2(order) || orderIdentity.kind !== "RESOLVED") {
      return {
        paymentConfirmed: true,
        ucpOrderId,
        orderLookupStatus: "IDENTIFIER_CONFLICT",
        orderWarning: "Payment is confirmed, but the UCP order response has missing, invalid, or conflicting ID aliases.",
        orderResumeCommand
      };
    }
    if (orderIdentity.value !== ucpOrderId) {
      return {
        paymentConfirmed: true,
        ucpOrderId,
        orderLookupStatus: "IDENTIFIER_CONFLICT",
        orderWarning: "Payment is confirmed, but the UCP order response ID does not match the requested UCP order ID.",
        orderResumeCommand
      };
    }
    return {
      paymentConfirmed: true,
      ucpOrderId,
      orderLookupStatus: "FETCHED",
      order
    };
  } catch (error) {
    rethrowPostPaymentAuthError(error);
    return {
      paymentConfirmed: true,
      ucpOrderId,
      orderLookupStatus: "ERROR",
      orderWarning: `Payment is confirmed, but UCP order lookup failed: ${postPaymentLookupError(error)}`,
      orderResumeCommand
    };
  }
}
var UCP_ORDER_PROJECTION_RETRY_DELAYS_MS = [0, 1e3, 2e3, 4e3, 8e3];
var sleepForUcpProjection = (milliseconds) => new Promise((resolve4) => setTimeout(resolve4, milliseconds));
async function resolveUcpOrderProjection(options2) {
  const retryDelaysMs = options2.retryDelaysMs ?? UCP_ORDER_PROJECTION_RETRY_DELAYS_MS;
  const sleep3 = options2.sleep ?? sleepForUcpProjection;
  let lastPending;
  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    const delayMs = retryDelaysMs[attempt] ?? 0;
    if (delayMs > 0) {
      await sleep3(delayMs);
    }
    try {
      const resolution = resolveUcpOrderIdFromCheckout(await options2.fetchCheckout(), options2.checkoutId);
      if (resolution.status !== "PENDING") {
        return resolution;
      }
      lastPending = resolution;
    } catch (error) {
      const canRetry = isRetryableUcpProjectionError(error) && attempt + 1 < retryDelaysMs.length;
      if (canRetry) {
        continue;
      }
      rethrowPostPaymentAuthError(error);
      return {
        status: "ERROR",
        warning: `Payment is confirmed, but UCP checkout lookup failed: ${postPaymentLookupError(error)}`
      };
    }
  }
  return lastPending ?? {
    status: "PENDING",
    warning: "Payment is confirmed, but the checkout has not projected a UCP order identifier yet."
  };
}
function isRetryableUcpProjectionError(error) {
  return error instanceof CliError && (error.type === "network_error" || error.type === "api_error" && (error.code === 429 || error.code >= 500));
}
function resolveUcpOrderIdFromCheckout(checkout, expectedCheckoutId) {
  if (!isJsonObject2(checkout)) {
    return {
      status: "IDENTIFIER_CONFLICT",
      warning: "Payment is confirmed, but the UCP checkout response is not an object."
    };
  }
  const checkoutIdentity = resolveStrictIdentifierAliases([
    { name: "data.id", value: checkout.id },
    { name: "data.checkoutId", value: checkout.checkoutId },
    { name: "data.checkout_id", value: checkout.checkout_id }
  ]);
  if (checkoutIdentity.kind !== "RESOLVED" || checkoutIdentity.value !== expectedCheckoutId) {
    return {
      status: "IDENTIFIER_CONFLICT",
      warning: "Payment is confirmed, but the UCP checkout response does not bind to the expected checkout ID."
    };
  }
  const ucp = checkout.ucp;
  if (ucp !== void 0 && !isJsonObject2(ucp)) {
    return {
      status: "IDENTIFIER_CONFLICT",
      warning: "Payment is confirmed, but data.ucp is malformed in the UCP checkout response."
    };
  }
  const order = checkout.order;
  if (order !== void 0 && !isJsonObject2(order)) {
    return {
      status: "IDENTIFIER_CONFLICT",
      warning: "Payment is confirmed, but data.order is malformed in the UCP checkout response."
    };
  }
  const checkoutStatus2 = normalizedString(checkout.status);
  const completed = ["COMPLETED", "COMPLETE", "SUCCEEDED", "SUCCESS"].includes(checkoutStatus2);
  const canonical = resolveStrictIdentifierAliases([
    {
      name: "data.ucp.ucp_order_id",
      value: isJsonObject2(ucp) ? ucp.ucp_order_id : void 0
    },
    {
      name: "data.ucp.ucpOrderId",
      value: isJsonObject2(ucp) ? ucp.ucpOrderId : void 0
    },
    { name: "data.ucp_order_id", value: checkout.ucp_order_id },
    { name: "data.ucpOrderId", value: checkout.ucpOrderId },
    { name: "data.omsOrderId", value: checkout.omsOrderId },
    { name: "data.oms_order_id", value: checkout.oms_order_id },
    ...completed ? [
      { name: "data.order.id", value: isJsonObject2(order) ? order.id : void 0 }
    ] : []
  ]);
  if (canonical.kind === "INVALID") {
    return {
      status: "IDENTIFIER_CONFLICT",
      warning: "Payment is confirmed, but the checkout contains a malformed UCP order identifier."
    };
  }
  if (canonical.kind === "RESOLVED") {
    return { status: "RESOLVED", ucpOrderId: canonical.value };
  }
  const projectionPending = ["COMPLETE_IN_PROGRESS", "PROCESSING", "COMPLETED"].includes(checkoutStatus2);
  if (!projectionPending) {
    return {
      status: "ERROR",
      warning: checkoutStatus2 ? `Payment is confirmed, but checkout status ${checkoutStatus2} does not support a pending UCP order projection.` : "Payment is confirmed, but the checkout status is missing; UCP order projection cannot be verified."
    };
  }
  return {
    status: "PENDING",
    warning: "Payment is confirmed, but the checkout has not projected a canonical UCP order ID or completed order compatibility ID yet."
  };
}
function resolveStrictIdentifierAliases(entries) {
  let resolved;
  for (const entry of entries) {
    if (entry.value === void 0) {
      continue;
    }
    if (typeof entry.value !== "string" || !entry.value.trim()) {
      return { kind: "INVALID" };
    }
    const candidate = entry.value.trim();
    if (resolved !== void 0 && resolved !== candidate) {
      return { kind: "INVALID" };
    }
    resolved = candidate;
  }
  return resolved === void 0 ? { kind: "ABSENT" } : { kind: "RESOLVED", value: resolved };
}
function postPaymentLookupError(error) {
  return error instanceof Error && error.message.trim() ? error.message.trim() : String(error);
}
function rethrowPostPaymentAuthError(error) {
  if (error instanceof CliError && error.type === "auth_error") {
    throw error;
  }
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
function parseEventTypeFlag(value) {
  if (value === void 0) {
    return void 0;
  }
  const types = value.split(",").map((type) => type.trim());
  if (types.some((type) => type.length === 0)) {
    throw validationError("invalid --type: expected one or more comma-separated event types");
  }
  return [...new Set(types)].join(",");
}
function buildResumeCommand(type, checkoutId, paymentInstrumentId, nextToken, ack, format, baseUrlOverride, executableName = MAIN_EXECUTABLE_NAME, ucpOrderId, checkoutEndpoint, eventOnly = false) {
  const parts = [`${executableName} events poll`];
  if (type) {
    parts.push(`--type ${quoteShellArgument(type)}`);
  }
  if (checkoutId) {
    parts.push(`--checkout-id ${quoteShellArgument(checkoutId)}`);
  }
  if (paymentInstrumentId) {
    parts.push(`--payment-instrument-id ${quoteShellArgument(paymentInstrumentId)}`);
  }
  if (ucpOrderId) {
    parts.push(`--ucp-order-id ${quoteShellArgument(ucpOrderId)}`);
  }
  if (checkoutEndpoint) {
    parts.push(`--endpoint ${quoteShellArgument(checkoutEndpoint)}`);
  }
  if (nextToken) {
    parts.push(`--next-token ${quoteShellArgument(nextToken)}`);
  }
  if (!ack) {
    parts.push("--no-ack");
  }
  if (eventOnly) {
    parts.push("--event-only");
  }
  parts.push(`--format ${format}`);
  const command = parts.join(" ");
  if (baseUrlOverride === void 0) {
    return command;
  }
  if (process.platform === "win32") {
    return `set "CLINK_BASE_URL=${baseUrlOverride.replaceAll('"', '""')}" && ${command}`;
  }
  return `CLINK_BASE_URL=${quoteShellArgument(baseUrlOverride)} ${command}`;
}
function quoteShellArgument(value) {
  if (/^[A-Za-z0-9._:/=-]+$/.test(value)) {
    return value;
  }
  if (process.platform === "win32") {
    return `"${value.replaceAll('"', '\\"')}"`;
  }
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}
function buildUcpCheckoutGetResumeCommand(checkoutId, endpoint, format, baseUrlOverride, executableName = MAIN_EXECUTABLE_NAME) {
  const parts = [`${executableName} ucp-checkout get`];
  if (endpoint) {
    parts.push(`--endpoint ${quoteShellArgument(endpoint)}`);
  }
  parts.push(`--checkout-id ${quoteShellArgument(checkoutId)}`, `--format ${format}`);
  return preserveBaseUrlOverride(parts.join(" "), baseUrlOverride);
}
function buildUcpOrderGetResumeCommand(orderId, format, baseUrlOverride, executableName = MAIN_EXECUTABLE_NAME) {
  return preserveBaseUrlOverride([
    `${executableName} ucp-order get`,
    `--order-id ${quoteShellArgument(orderId)}`,
    `--format ${format}`
  ].join(" "), baseUrlOverride);
}
function preserveBaseUrlOverride(command, baseUrlOverride) {
  if (baseUrlOverride === void 0) {
    return command;
  }
  if (process.platform === "win32") {
    return `set "CLINK_BASE_URL=${baseUrlOverride.replaceAll('"', '""')}" && ${command}`;
  }
  return `CLINK_BASE_URL=${quoteShellArgument(baseUrlOverride)} ${command}`;
}
function canonicalWalletOriginForResume(baseUrl) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw configError("resume commands require an absolute HTTPS wallet API URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    throw configError("resume commands require an absolute HTTPS wallet API URL");
  }
  return parsed.origin;
}
function buildUcpOrderDeliveryResumeCommand(orderId, maxWaitSeconds, format, baseUrlOverride, executableName = MAIN_EXECUTABLE_NAME) {
  const command = [
    `${executableName} ucp-order wait-delivery`,
    `--order-id ${quoteShellArgument(orderId)}`,
    `--max-wait ${maxWaitSeconds}`,
    `--format ${format}`
  ].join(" ");
  return preserveBaseUrlOverride(command, canonicalWalletOriginForResume(baseUrlOverride));
}
async function handleWalletCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "wallet");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "init":
      return walletInit(context);
    case "logout":
      return walletLogout(context);
    case "status":
      return walletStatus(context);
    default:
      throw validationError("unsupported wallet command");
  }
}
async function walletInit(context) {
  const email = requireStringFlag(context.args.flags, "missing --email", "email").trim();
  if (getStringFlag(context.args.flags, "name") !== void 0) {
    throw validationError("--name is no longer used by wallet init; the initial name comes from the email text before @, use `config set name` to change it");
  }
  if (!email) {
    throw validationError("email must not be blank");
  }
  if (email.length > 255) {
    throw validationError("email must be at most 255 characters");
  }
  const emailSeparatorIndex = email.indexOf("@");
  const name = emailSeparatorIndex > 0 ? email.slice(0, emailSeparatorIndex).trim() : "";
  if (!name) {
    throw validationError("email must include a name before @");
  }
  if (name.length > 50) {
    throw validationError("email name before @ must be at most 50 characters; use `config set name` to change it after initialization");
  }
  if (getStringFlag(context.args.flags, "otp")) {
    throw validationError("--otp is no longer used by wallet init; complete email verification in the browser");
  }
  const instructionContext = await buildQuickInstructionContext(context.args.flags, "wallet init");
  const baseUrl = resolveWalletInitBaseUrl(context.args.flags);
  const deviceId = resolveOAuthDeviceId(context.storedConfig);
  const agentClient = await resolveAgentClientBootstrap(deviceId);
  const authorization = await createDeviceAuthorization({
    baseUrl,
    deviceId,
    agentClient,
    scope: context.oauthScope,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun,
    ...instructionContext ? { instructionContext } : {}
  });
  if (isDryRun3(authorization)) {
    printSuccess(authorization, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  const verificationUrl = buildVerificationUrl(authorization, email, name);
  const walletInitGeneration = await beginWalletInit(context.startedAt);
  if (!walletInitGeneration) {
    throw authError(WALLET_INIT_SUPERSEDED_MESSAGE, 409);
  }
  const isCurrent = () => isWalletInitCurrent(walletInitGeneration);
  process.stderr.write("Starting wallet login; this attempt takes precedence over any earlier one.\n");
  process.stderr.write(`Complete authorization in your browser:
${verificationUrl}
`);
  if (context.globalOptions.open) {
    process.stderr.write("Opening your browser...\n");
    maybeOpenBrowser(context.globalOptions.open, verificationUrl);
  }
  process.stderr.write("Waiting for authorization...\n");
  const token = await pollDeviceToken({
    baseUrl,
    deviceId,
    deviceCode: authorization.deviceCode,
    expiresIn: authorization.expiresIn,
    interval: authorization.interval,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: false,
    isCurrent
  });
  const storedAuthorization = toStoredAuthorization(deviceId, token, baseUrl);
  let nextConfig;
  try {
    nextConfig = await updateStoredConfig(async (current) => {
      await assertWalletInitCurrent(isCurrent);
      const merged = mergeOAuthLoginConfig(current, {
        baseUrl,
        email,
        name,
        customerId: token.customerId,
        authorization: storedAuthorization
      });
      return context.configLifecycle.afterWalletLogin?.(current, merged) ?? merged;
    });
  } catch (error) {
    await revokeUncommittedWalletAuthorization(storedAuthorization, context.globalOptions.timeoutMs);
    throw error;
  }
  const paymentMethodsCache = await refreshPaymentMethodsAfterWalletInit(context, nextConfig);
  const printed = await runIfWalletInitCurrent(walletInitGeneration, () => {
    printSuccess({
      customerId: token.customerId,
      email,
      name,
      hasAuthorization: true,
      authorizationType: "oauth",
      hasCustomerApiKey: Boolean(nextConfig.customerApiKey),
      bindingUrl: paymentMethodsCache.bindingUrl,
      paymentMethodsCached: paymentMethodsCache.cached,
      paymentMethodCount: paymentMethodsCache.count,
      agentClientId: token.agentClientId ?? null,
      visaRegistrationStatus: token.visaRegistrationStatus ?? null,
      pendingInstructionId: token.pendingInstructionId ?? null,
      ...paymentMethodsCache.error ? { paymentMethodsCacheError: paymentMethodsCache.error } : {},
      configPath: "~/.clink-cli/config.json"
    }, context.globalOptions.format);
  });
  if (!printed) {
    throw authError(WALLET_INIT_SUPERSEDED_MESSAGE, 409);
  }
  return EXIT_CODES.OK;
}
async function assertWalletInitCurrent(isCurrent) {
  if (!await isCurrent()) {
    throw authError(WALLET_INIT_SUPERSEDED_MESSAGE, 409);
  }
}
async function revokeUncommittedWalletAuthorization(authorization, timeoutMs) {
  let storedConfig;
  try {
    storedConfig = await readStoredConfig();
  } catch {
    process.stderr.write("Warning: could not verify whether the wallet authorization was stored; skipping revoke to avoid invalidating a committed login.\n");
    return;
  }
  const storedAuthorization = storedConfig.authorization;
  const committed = storedAuthorization !== void 0 && (authorization.sessionId !== void 0 && storedAuthorization.sessionId === authorization.sessionId || storedAuthorization.accessToken === authorization.accessToken && storedAuthorization.refreshToken === authorization.refreshToken);
  if (committed) {
    return;
  }
  try {
    await revokeStoredAuthorization({
      authorization,
      timeoutMs,
      dryRun: false
    });
  } catch {
    process.stderr.write("Warning: failed to revoke an uncommitted wallet authorization; it will expire automatically.\n");
  }
}
async function refreshPaymentMethodsAfterWalletInit(context, config) {
  if (!config.customerId || !config.authorization && !config.customerApiKey) {
    return {
      bindingUrl: null,
      cached: false,
      count: 0,
      error: "missing customer credentials in OAuth response"
    };
  }
  const refreshContext = {
    ...context,
    storedConfig: config,
    runtimeConfig: {
      baseUrl: config.baseUrl,
      defaultOpenLinks: config.defaultOpenLinks,
      customerId: config.customerId,
      ...config.authorization ? { authorization: { ...config.authorization } } : {},
      ...config.customerApiKey ? { customerApiKey: config.customerApiKey } : {},
      ...config.email ? { email: config.email } : {},
      ...config.name ? { name: config.name } : {}
    },
    authorizationIdentity: runtimeAuthorizationIdentity(resolveRuntimeConfig(config, {})),
    globalOptions: {
      ...context.globalOptions,
      dryRun: false,
      open: false,
      watch: false
    }
  };
  try {
    const result = await callBindingLink(refreshContext);
    if (isDryRun3(result)) {
      return { bindingUrl: null, cached: false, count: 0 };
    }
    const data = unwrapApiData(result.body);
    const bindingUrl = buildAgentPortalUrl(asRequiredString(data.bindingUrl, "missing bindingUrl in response"), resolveAgentBaseUrl(refreshContext.runtimeConfig.baseUrl), CARD_SETUP_PATH, refreshContext.runtimeConfig.email);
    const count = await cachePaymentMethods(refreshContext, data.paymentMethodsVoList);
    return { bindingUrl, cached: true, count };
  } catch (error) {
    return {
      bindingUrl: null,
      cached: false,
      count: 0,
      error: stringifyRefreshError(error)
    };
  }
}
async function walletLogout(context) {
  const authorization = context.storedConfig.authorization;
  const logoutIdentity = context.authorizationIdentity;
  if (context.globalOptions.dryRun) {
    if (authorization) {
      const result = await revokeStoredAuthorization({
        authorization,
        timeoutMs: context.globalOptions.timeoutMs,
        dryRun: true
      });
      printSuccess(result, context.globalOptions.format);
    } else {
      printSuccess({
        dryRun: true,
        wouldRemoveAuthorization: false,
        wouldRemoveCustomerApiKey: Boolean(context.storedConfig.customerApiKey),
        wouldRemoveCustomerId: Boolean(context.storedConfig.customerId)
      }, context.globalOptions.format);
    }
    return EXIT_CODES.OK;
  }
  let serverRevocation = "not_applicable";
  if (authorization) {
    try {
      await revokeStoredAuthorization({
        authorization,
        timeoutMs: context.globalOptions.timeoutMs,
        dryRun: false
      });
      serverRevocation = "succeeded";
    } catch {
      serverRevocation = "failed";
    }
  }
  const hadCustomerApiKey = Boolean(context.storedConfig.customerApiKey);
  const hadCustomerId = Boolean(context.storedConfig.customerId);
  await updateStoredConfig((current) => {
    const currentIdentity = runtimeAuthorizationIdentity(resolveRuntimeConfig(current, context.args.flags));
    const legacyOAuthChanged = Boolean(authorization && !authorization.sessionId && current.authorization && current.authorization.accessToken !== authorization.accessToken);
    if (currentIdentity.type !== "none" && (currentIdentity.type !== logoutIdentity.type || !authorizationIdentityCanContinue(logoutIdentity, currentIdentity) || legacyOAuthChanged)) {
      throw authError("Authentication changed while logout was in progress; the newer login was preserved.");
    }
    delete current.authorization;
    delete current.customerApiKey;
    delete current.customerId;
    delete current.paymentMethods;
    delete current.riskRules;
    return context.configLifecycle.afterWalletLogout?.(current) ?? current;
  });
  printSuccess({
    loggedOut: true,
    serverRevocation,
    authorizationRemoved: Boolean(authorization),
    customerApiKeyRemoved: hadCustomerApiKey,
    customerIdRemoved: hadCustomerId,
    configPath: "~/.clink-cli/config.json"
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function walletStatus(context) {
  const storedAuthorization = context.runtimeConfig.authorization;
  const authorizationEnvironmentMatches = storedAuthorization ? sameHttpOrigin(storedAuthorization.issuerOrigin, context.runtimeConfig.baseUrl) : null;
  const authorization = authorizationEnvironmentMatches ? storedAuthorization : void 0;
  const hasEffectiveCustomerApiKey = !authorization && Boolean(context.runtimeConfig.customerApiKey);
  printSuccess({
    baseUrl: context.runtimeConfig.baseUrl,
    customerId: context.runtimeConfig.customerId ?? null,
    email: context.runtimeConfig.email ?? null,
    name: context.runtimeConfig.name ?? null,
    hasAuthorization: Boolean(authorization),
    hasStoredAuthorization: Boolean(storedAuthorization),
    authorizationEnvironmentMatches,
    authorizationType: authorization ? "oauth" : context.runtimeConfig.customerApiKey ? "csk" : null,
    accessTokenExpiresAt: storedAuthorization ? new Date(storedAuthorization.accessTokenExpiresAt).toISOString() : null,
    refreshTokenExpiresAt: storedAuthorization ? new Date(storedAuthorization.refreshTokenExpiresAt).toISOString() : null,
    hasCustomerApiKey: hasEffectiveCustomerApiKey,
    oauthRequired: Boolean(context.storedConfig.oauthRequired || storedAuthorization),
    defaultOpenLinks: context.runtimeConfig.defaultOpenLinks,
    configPath: "~/.clink-cli/config.json"
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function handleCardCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "card");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "binding-link":
      return cardBindingLink(context);
    case "setup-link":
      return cardRedirectLink(context, CARD_SETUP_PATH, "card setup");
    case "modify-link":
      return cardRedirectLink(context, CARD_MANAGEMENT_PATH, "card management");
    case "passkey-link":
      return cardPasskeyLink(context);
    case "list":
      return cardList(context);
    case "get":
      return cardGet(context);
    default:
      throw validationError("unsupported card command");
  }
}
async function cardBindingLink(context) {
  const prepared = await resolveBindingLink(context, CARD_SETUP_PATH);
  if (prepared.dryRun) {
    printSuccess(prepared.result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  const staleEventCutoffMs = Date.now();
  const printBindingHandoff = (watchReady) => printSuccess({
    ...prepared.data,
    bindingUrl: prepared.url,
    paymentMethodsVoList: Array.isArray(prepared.data.paymentMethodsVoList) ? prepared.data.paymentMethodsVoList : [],
    watchReady,
    watchEventType: watchReady ? "payment_method.added" : null
  }, context.globalOptions.format);
  if (!context.globalOptions.watch) {
    printBindingHandoff(false);
  }
  await maybeWatchEvents(context, prepared.url, "card binding", {
    staleEventCutoffMs,
    eventType: "payment_method.added",
    ackUnmatchedEvents: false
  }, () => printBindingHandoff(true));
  return EXIT_CODES.OK;
}
async function cardRedirectLink(context, targetPath, label) {
  const prepared = await resolveBindingLink(context, targetPath);
  if (prepared.dryRun) {
    printSuccess(prepared.result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  const staleEventCutoffMs = Date.now();
  await openPortalWithBrowserHandoff(context, prepared.url);
  printSuccess({
    url: prepared.url,
    paymentMethodsVoList: prepared.data.paymentMethodsVoList ?? []
  }, context.globalOptions.format);
  await maybeWatchEvents(context, prepared.url, label, { staleEventCutoffMs });
  return EXIT_CODES.OK;
}
async function cardPasskeyLink(context) {
  const paymentInstrumentId = requireStringFlag(context.args.flags, "missing --payment-instrument-id", "payment-instrument-id");
  const url = buildAgentPasskeyUrl(resolveAgentBaseUrl(context.runtimeConfig.baseUrl), paymentInstrumentId, void 0, context.runtimeConfig.email);
  const browserLaunch = await openPortalWithBrowserHandoff(context, url);
  printSuccess({
    url,
    paymentInstrumentId,
    manualOpenUrl: url,
    browserLaunch
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function resolveBindingLink(context, targetPath) {
  const result = await callBindingLink(context);
  if (isDryRun3(result)) {
    return { dryRun: true, result };
  }
  const data = unwrapApiData(result.body);
  await cachePaymentMethods(context, data.paymentMethodsVoList);
  const bindingUrl = asRequiredString(data.bindingUrl, "missing bindingUrl in response");
  const url = buildAgentPortalUrl(bindingUrl, resolveAgentBaseUrl(context.runtimeConfig.baseUrl), targetPath, context.runtimeConfig.email);
  return { dryRun: false, data, url };
}
async function callBindingLink(context) {
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: "/agent/cwallet/card/bindingLink",
    headers: buildCustomerHeaders(runtimeConfig),
    body: {
      customerId: runtimeConfig.customerId,
      hasCustomerApiKey: !runtimeConfig.authorization && Boolean(runtimeConfig.customerApiKey)
    },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  if (!isDryRun3(result)) {
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
    printContextHelp(context, "risk");
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
  const staleEventCutoffMs = Date.now();
  maybeOpenBrowser(context.globalOptions.open, url);
  printSuccess({ url }, context.globalOptions.format);
  await maybeWatchEvents(context, url, "risk rule configuration", { staleEventCutoffMs });
  return EXIT_CODES.OK;
}
async function riskRuleGet(context) {
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "GET",
    path: "/agent/risk/rule/settings",
    headers: buildCustomerHeaders(runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function handlePayCommand(context) {
  const flags = context.args.flags;
  const sessionId = getStringFlag(flags, "session-id");
  const merchantId = getStringFlag(flags, "merchant-id");
  const paymentMethodType = getStringFlag(flags, "payment-method-type") ?? "CARD";
  const terminalQr = getBooleanFlag(flags, "terminal-qr");
  if (!sessionId && !merchantId) {
    throw validationError("pay requires either --merchant-id or --session-id");
  }
  if (sessionId && merchantId) {
    throw validationError("pay accepts either --merchant-id or --session-id, not both");
  }
  const paymentMethodApi = createPaymentMethodApi(context);
  let paymentInstrumentId = getStringFlag(flags, "payment-instrument-id");
  const requiresTypeMatch = requiresTypeMatchedPaymentInstrument(paymentMethodType);
  const allowsMissingInstrument = allowsMissingPaymentInstrument(paymentMethodType);
  const typeValidationMethods = requiresTypeMatch && (paymentInstrumentId !== void 0 || !allowsMissingInstrument) ? context.globalOptions.dryRun ? getStoredPaymentMethods(context) : await paymentMethodApi.refreshPaymentMethods() : void 0;
  if (!paymentInstrumentId && !allowsMissingInstrument) {
    paymentInstrumentId = requiresTypeMatch ? selectPaymentInstrumentByType(typeValidationMethods, paymentMethodType) : await resolveDefaultPaymentInstrumentId(context);
  } else if (paymentInstrumentId && requiresTypeMatch) {
    paymentInstrumentId = validatePaymentInstrumentType(typeValidationMethods, paymentInstrumentId, paymentMethodType);
  }
  const legacyPurchaseInstructionId = getStringFlag(flags, "purchase-instruction-id");
  const explicitInstructionId = getStringFlag(flags, "instruction-id");
  const instructionId = explicitInstructionId ?? legacyPurchaseInstructionId;
  if (legacyPurchaseInstructionId !== void 0 && explicitInstructionId !== void 0 && legacyPurchaseInstructionId !== explicitInstructionId) {
    throw validationError("--instruction-id and --purchase-instruction-id must match when both are provided");
  }
  const mandateId = getStringFlag(flags, "mandate-id");
  const shippingAddress = optionalJsonObjectFlag2(flags, "shipping-address");
  const products = optionalJsonArrayFlag(flags, "products");
  const authorization = instructionId || mandateId || legacyPurchaseInstructionId ? {
    ...instructionId ? { instructionId } : {},
    ...mandateId ? { mandateId } : {},
    ...legacyPurchaseInstructionId ? { legacyInstructionId: legacyPurchaseInstructionId } : {}
  } : void 0;
  const chargeInput = sessionId ? {
    mode: "session",
    ...paymentInstrumentId ? { paymentInstrumentId } : {},
    paymentMethodType,
    sessionId,
    ...authorization ? { authorization } : {},
    ...shippingAddress ? { shippingAddress } : {},
    ...products ? { products } : {}
  } : {
    mode: "direct",
    ...paymentInstrumentId ? { paymentInstrumentId } : {},
    paymentMethodType,
    merchantId,
    amount: parseAmount(requireStringFlag(flags, "missing --amount", "amount")),
    currency: requireStringFlag(flags, "missing --currency", "currency"),
    ...authorization ? { authorization } : {},
    ...shippingAddress ? { shippingAddress } : {},
    ...products ? { products } : {}
  };
  const getRuntimeConfig = createRuntimeConfigLoader(context);
  const refreshRuntimeConfig = createRuntimeConfigRefresher(context);
  const execution = await executeCharge(chargeInput, {
    runtimeConfig: context.runtimeConfig,
    getRuntimeConfig,
    refreshRuntimeConfig,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun,
    refreshPaymentMethods: paymentMethodApi.refreshPaymentMethods
  });
  if (execution.dryRun) {
    printSuccess(execution.request, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  const safePaymentData = redactPaymentQrSecrets(execution.data);
  const staleEventCutoffMs = Date.now();
  if (execution.requires3ds && execution.redirectUrl) {
    printSuccess(addPaymentMethodsRefreshWarning(safePaymentData, execution.paymentMethodsRefreshWarning), context.globalOptions.format);
    await maybeWatchEvents(context, execution.redirectUrl, "3-D Secure authentication", {
      staleEventCutoffMs
    });
    return EXIT_CODES.THREE_DS;
  }
  if (execution.qrCode) {
    const qrCode = execution.qrCode;
    const customerAction = await materializeQrCodeCustomerAction(qrCode).catch((error) => {
      throw paymentStateUnknownError("payment was submitted but its QR code could not be stored; do not retry automatically", {
        paymentState: "UNKNOWN",
        paymentSubmitted: true,
        retryAllowed: false,
        orderId: qrCode.orderId,
        paymentExecutionDetailId: qrCode.paymentExecutionDetailId,
        paymentStatus: execution.status ?? null,
        failure: error instanceof CliError ? error.message : "failed to store payment QR code"
      });
    });
    if (terminalQr) {
      await writeTerminalQrCode(qrCode.content);
    }
    printSuccess(addPaymentMethodsRefreshWarning(buildQrCodePaymentOutput(execution.data, customerAction), execution.paymentMethodsRefreshWarning), context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  printSuccess(addPaymentMethodsRefreshWarning(safePaymentData, execution.paymentMethodsRefreshWarning), context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function resolveDefaultPaymentInstrumentId(context) {
  return pickDefaultPaymentInstrument(getStoredPaymentMethods(context));
}
async function handleRefundCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "refund");
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
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: "/agent/cwallet/refund/apply",
    headers: buildCustomerHeaders(runtimeConfig),
    body: { orderId },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function refundGet(context) {
  const refundId = requireStringFlag(context.args.flags, "missing --refund-id", "refund-id");
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "GET",
    path: `/agent/cwallet/refund/${encodeURIComponent(refundId)}`,
    headers: buildCustomerHeaders(runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function handleUcpCheckoutCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "ucp-checkout");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "run":
      return ucpCheckoutRun(context);
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
async function handleUcpCatalogCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "ucp-catalog");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "search":
      return ucpCatalogSearch(context);
    case "product":
      return ucpCatalogProduct(context);
    default:
      throw validationError(`unsupported ucp-catalog command: ${subcommand}`);
  }
}
async function ucpCatalogSearch(context) {
  const flags = context.args.flags;
  rejectPublicCatalogAuthenticationFlags(flags);
  rejectUcpCatalogFlags(flags, "search", ["product-id"]);
  const merchantId = requireNonBlankFlag(flags, "merchant-id", "missing --merchant-id");
  const query = requireNonBlankFlag(flags, "query", "missing --query");
  const limit = parseIntFlag(getStringFlag(flags, "limit"), "--limit must be an integer between 1 and 100", 1);
  if (limit !== void 0 && limit > 100) {
    throw validationError("--limit must be an integer between 1 and 100");
  }
  const cursor = getStringFlag(flags, "cursor")?.trim() || void 0;
  const pagination = compact3({ cursor, limit });
  const requestContext = publicCatalogContextFlag(flags);
  const body = compact3({
    query,
    context: requestContext,
    signals: optionalJsonObjectFlag2(flags, "signals"),
    attribution: optionalJsonObjectFlag2(flags, "attribution"),
    filters: optionalJsonObjectFlag2(flags, "filters"),
    pagination: Object.keys(pagination).length > 0 ? pagination : void 0
  });
  const requestId = getStringFlag(flags, "request-id")?.trim() || randomUUID4();
  const ucpAgent = getStringFlag(flags, "ucp-agent")?.trim() || DEFAULT_UCP_AGENT;
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: `/agent/ucp/${encodeURIComponent(merchantId)}/catalog/search`,
    acceptLanguage: publicCatalogAcceptLanguage(requestContext),
    headers: {
      "Request-Id": requestId,
      "UCP-Agent": ucpAgent
    },
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishPublicCatalogCommand(result, context);
}
async function ucpCatalogProduct(context) {
  const flags = context.args.flags;
  rejectPublicCatalogAuthenticationFlags(flags);
  rejectUcpCatalogFlags(flags, "product", ["query", "cursor", "limit"]);
  const merchantId = requireNonBlankFlag(flags, "merchant-id", "missing --merchant-id");
  const productId = requireNonBlankFlag(flags, "product-id", "missing --product-id");
  const requestContext = publicCatalogContextFlag(flags);
  const body = compact3({
    id: productId,
    context: requestContext,
    signals: optionalJsonObjectFlag2(flags, "signals"),
    attribution: optionalJsonObjectFlag2(flags, "attribution"),
    filters: optionalJsonObjectFlag2(flags, "filters")
  });
  const requestId = getStringFlag(flags, "request-id")?.trim() || randomUUID4();
  const ucpAgent = getStringFlag(flags, "ucp-agent")?.trim() || DEFAULT_UCP_AGENT;
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: `/agent/ucp/${encodeURIComponent(merchantId)}/catalog/product`,
    acceptLanguage: publicCatalogAcceptLanguage(requestContext),
    headers: {
      "Request-Id": requestId,
      "UCP-Agent": ucpAgent
    },
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishPublicCatalogCommand(result, context);
}
function rejectUcpCatalogFlags(flags, subcommand, unsupportedFlags) {
  const unsupported = unsupportedFlags.find((name) => name in flags);
  if (unsupported) {
    throw validationError(`--${unsupported} is not supported by ucp-catalog ${subcommand}`);
  }
}
function rejectPublicCatalogAuthenticationFlags(flags) {
  const unsupported = ["customer-api-key", "customer-id"].find((name) => name in flags);
  if (unsupported) {
    throw validationError(`--${unsupported} is not supported by public Catalog commands`);
  }
}
function publicCatalogContextFlag(flags) {
  const requestContext = optionalJsonObjectFlag2(flags, "context");
  const language = getStringFlag(flags, "language");
  const hasContextLanguage = requestContext !== void 0 && "language" in requestContext;
  if (language !== void 0 && hasContextLanguage) {
    throw validationError("--language and a context.language value cannot be used together");
  }
  if (language !== void 0) {
    return {
      ...requestContext ?? {},
      language: normalizeCatalogLanguage(language, "--language")
    };
  }
  if (!hasContextLanguage || requestContext === void 0) {
    return requestContext;
  }
  return {
    ...requestContext,
    language: normalizeCatalogLanguage(requestContext.language, "context.language")
  };
}
function normalizeCatalogLanguage(value, field) {
  const message = `${field} must be an IETF BCP 47 language tag such as "en", "zh-Hans", or "fr-CA"`;
  if (typeof value !== "string") {
    throw validationError(message);
  }
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 64) {
    throw validationError(message);
  }
  let locale;
  try {
    locale = new Intl.Locale(candidate);
  } catch {
    throw validationError(message);
  }
  const language = locale.language;
  if (!language || language.toLowerCase() === "und") {
    throw validationError(message);
  }
  if (language.toLowerCase() !== "zh") {
    return locale.toString();
  }
  if (locale.script === "Hant") {
    return "zh-Hant";
  }
  if (locale.script === "Hans") {
    return "zh-Hans";
  }
  if (locale.script) {
    throw validationError(message);
  }
  switch (locale.region ?? "") {
    case "TW":
    case "HK":
    case "MO":
      return "zh-Hant";
    case "":
    case "CN":
    case "SG":
    case "MY":
      return "zh-Hans";
    default:
      throw validationError(message);
  }
}
function publicCatalogAcceptLanguage(requestContext) {
  return typeof requestContext?.language === "string" ? requestContext.language : null;
}
async function handleCatalogCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "catalog");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "search":
      return catalogSearch(context);
    default:
      throw validationError(`unsupported catalog command: ${subcommand}`);
  }
}
async function catalogSearch(context) {
  const flags = context.args.flags;
  rejectPublicCatalogAuthenticationFlags(flags);
  if ("merchant-id" in flags) {
    throw validationError("--merchant-id is not supported by catalog search; use ucp-catalog search");
  }
  const unsupportedPaginationFlag = ["limit", "cursor"].find((name) => name in flags);
  if (unsupportedPaginationFlag) {
    throw validationError(`--${unsupportedPaginationFlag} is not supported by catalog search; broad discovery currently has no pagination`);
  }
  const query = requireNonBlankFlag(flags, "query", "missing --query");
  const requestContext = publicCatalogContextFlag(flags);
  const body = compact3({
    query,
    context: requestContext,
    signals: optionalJsonObjectFlag2(flags, "signals"),
    attribution: optionalJsonObjectFlag2(flags, "attribution"),
    filters: optionalJsonObjectFlag2(flags, "filters"),
    channel_type: getStringFlag(flags, "channel-type")?.trim() || void 0,
    form_type: getStringFlag(flags, "form-type")?.trim() || void 0,
    ext: optionalJsonObjectFlag2(flags, "ext")
  });
  const requestId = getStringFlag(flags, "request-id")?.trim() || randomUUID4();
  const ucpAgent = getStringFlag(flags, "ucp-agent")?.trim() || DEFAULT_UCP_AGENT;
  const result = await requestJson({
    baseUrl: context.runtimeConfig.baseUrl,
    method: "POST",
    path: EXTRA_CATALOG_SEARCH_PATH,
    acceptLanguage: publicCatalogAcceptLanguage(requestContext),
    headers: {
      "Request-Id": requestId,
      "UCP-Agent": ucpAgent
    },
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  });
  return finishPublicCatalogCommand(result, context);
}
async function handleUcpOrderCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "ucp-order");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "get":
      return ucpOrderGet(context);
    case "wait-delivery":
      return ucpOrderWaitDelivery(context);
    case "list":
      return ucpOrderList(context);
    default:
      throw validationError(`unsupported ucp-order command: ${subcommand}`);
  }
}
async function ucpOrderGet(context) {
  const orderId = requireNonBlankFlag(context.args.flags, "order-id", "missing --order-id");
  const result = await requestUcpOrder(context, orderId);
  return finishApiCommand(result, context);
}
async function ucpOrderWaitDelivery(context) {
  const orderId = requireNonBlankFlag(context.args.flags, "order-id", "missing --order-id");
  const maxWaitSeconds = parseIntFlag(getStringFlag(context.args.flags, "max-wait"), "--max-wait must be an integer of at least 1 second", 1) ?? DEFAULT_UCP_DELIVERY_WAIT_SECONDS;
  if (context.globalOptions.dryRun) {
    return finishApiCommand(await requestUcpOrder(context, orderId), context);
  }
  const result = await waitForUcpOrderDigitalDelivery(context, orderId, maxWaitSeconds);
  printSuccess({
    ...result,
    ...result.timedOut ? {
      resumeCommand: buildUcpOrderDeliveryResumeCommand(orderId, maxWaitSeconds, context.globalOptions.format, context.runtimeConfig.baseUrl, context.executableName)
    } : {}
  }, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function waitForUcpOrderDigitalDelivery(context, orderId, maxWaitSeconds) {
  const maxWaitMs = maxWaitSeconds * 1e3;
  await refreshOAuthAuthorization(context, {
    minimumValidityMs: maxWaitMs + context.globalOptions.timeoutMs + OAUTH_OPERATION_VALIDITY_BUFFER_MS
  });
  return waitForUcpDigitalDelivery({
    orderId,
    maxWaitMs,
    fetchOrder: async () => {
      const response = await requestUcpOrder(context, orderId);
      if (isDryRun3(response)) {
        throw validationError("ucp-order wait-delivery cannot poll a dry-run response");
      }
      assertApiSuccess(response.status, response.body);
      return unwrapApiData(response.body);
    }
  });
}
function requestUcpOrder(context, orderId) {
  return requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "GET",
    path: `${UCP_ORDER_PATH}/${encodeURIComponent(orderId)}`,
    headers: buildCustomerApiKeyHeaders(runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
}
async function ucpOrderList(context) {
  const flags = context.args.flags;
  if ("order-id" in flags) {
    throw validationError("--order-id is not supported by ucp-order list; use ucp-order get");
  }
  const status = parseUcpOrderStatusFlag(flags);
  const createdFrom = parseUcpOrderTimeFlag(flags, "start-time");
  const createdTo = parseUcpOrderTimeFlag(flags, "end-time");
  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw validationError("--start-time must not be after --end-time");
  }
  const page = parseIntFlag(getStringFlag(flags, "page"), "--page must be an integer of at least 1", 1);
  const size = parseIntFlag(getStringFlag(flags, "size"), "--size must be an integer of at least 1", 1);
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "GET",
    path: UCP_ORDER_PATH,
    headers: buildCustomerApiKeyHeaders(runtimeConfig),
    query: { created_from: createdFrom, created_to: createdTo, status, page, size },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
function parseUcpOrderStatusFlag(flags) {
  if (!("status" in flags)) {
    return void 0;
  }
  const raw = getStringFlag(flags, "status")?.trim();
  if (!raw) {
    throw validationError("--status must not be blank");
  }
  const statuses = raw.split(",").map((value) => value.trim().toLowerCase());
  if (statuses.some((value) => !value)) {
    throw validationError("--status must not contain blank values");
  }
  const unsupported = statuses.find((value) => !UCP_ORDER_STATUSES.has(value));
  if (unsupported) {
    throw validationError(`unsupported order status: ${unsupported}; expected ${[...UCP_ORDER_STATUSES].join(", ")}`);
  }
  return [...new Set(statuses)];
}
var UCP_ORDER_TIME_ZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;
var UCP_ORDER_TIME_COMPONENT = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
function parseUcpOrderTimeFlag(flags, name) {
  if (!(name in flags)) {
    return void 0;
  }
  const raw = getStringFlag(flags, name)?.trim();
  if (!raw) {
    throw validationError(`--${name} must not be blank`);
  }
  const normalized = UCP_ORDER_TIME_COMPONENT.test(raw) && !UCP_ORDER_TIME_ZONE_SUFFIX.test(raw) ? `${raw.replace(" ", "T")}Z` : raw;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    throw validationError(`--${name} must be a UTC RFC 3339 timestamp, for example 2026-07-30T00:00:00Z or 2026-07-30`);
  }
  return new Date(timestamp).toISOString();
}
function requireNonBlankFlag(flags, name, missingMessage) {
  const value = requireStringFlag(flags, missingMessage, name).trim();
  if (!value) {
    throw validationError(`--${name} must not be blank`);
  }
  return value;
}
async function ucpCheckoutRun(context) {
  printSuccess(await executeUcpCheckoutRun(context, { returnSafeCompleteFailure: true }), context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function executeUcpCheckoutRun(context, options2 = {}) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
  if ("checkout-id" in flags) {
    throw validationError("--checkout-id is not supported by ucp-checkout run; checkout is created by this command");
  }
  if ("credential-token" in flags) {
    throw validationError("--credential-token is not supported on external ucp-checkout run; pass --payment-instrument-id");
  }
  const waitDelivery = getBooleanFlag(flags, "wait-delivery");
  if ("max-wait" in flags && !waitDelivery) {
    throw validationError("--max-wait requires --wait-delivery on ucp-checkout run");
  }
  const maxWaitSeconds = waitDelivery ? parseIntFlag(getStringFlag(flags, "max-wait"), "--max-wait must be an integer of at least 1 second", 1) ?? DEFAULT_UCP_DELIVERY_WAIT_SECONDS : DEFAULT_UCP_DELIVERY_WAIT_SECONDS;
  const preparedCreate = prepareUcpCheckoutCreate(context, {
    requireMajorUnitMoneyStrings: true
  });
  const createResult = await requestOAuthBusinessJsonOnce(context, (runtimeConfig) => buildUcpCheckoutCreateRequest(context, runtimeConfig, preparedCreate));
  if (isDryRun3(createResult)) {
    const checkoutIdTemplate = "{checkoutId}";
    const preparedComplete2 = await prepareUcpCheckoutComplete(context, checkoutIdTemplate);
    const completeResult = await requestOAuthBusinessJsonOnce(context, (runtimeConfig) => buildUcpCheckoutCompleteRequest(context, runtimeConfig, preparedComplete2));
    if (!isDryRun3(completeResult)) {
      throw apiError("ucp-checkout run dry-run unexpectedly produced a live complete response");
    }
    return buildUcpCheckoutRunDryRunPlan({
      create: createResult,
      complete: completeResult,
      endpoint: ucpCheckoutEndpointPrefix(preparedCreate.target),
      waitDelivery,
      maxWaitSeconds,
      confirmedPurchase: getBooleanFlag(flags, "confirm-purchase")
    });
  }
  assertApiSuccess(createResult.status, createResult.body);
  const create = requireUcpCheckoutRunData(createResult.body, "create");
  const checkoutId = requireUcpCheckoutRunCheckoutId(create);
  const createStatus = normalizedUcpCheckoutRunStatus(create);
  const createOrderId = ucpCheckoutRunOrderId(create, "create");
  const endpoint = ucpCheckoutEndpointPrefix(preparedCreate.target);
  if (createStatus !== "ready_for_complete") {
    return {
      stage: "create",
      status: createStatus,
      checkoutId,
      endpoint,
      ...createOrderId ? { orderId: createOrderId } : {},
      paymentSubmitted: false,
      attempts: {
        create: 1,
        complete: 0
      },
      create
    };
  }
  let preparedComplete;
  let refreshed;
  let complete;
  let completeStatus;
  let orderId;
  try {
    preparedComplete = await prepareUcpCheckoutComplete(context, checkoutId);
    refreshed = await executePaymentRequestWithRefresh({
      request: () => requestOAuthBusinessJsonOnce(context, (runtimeConfig) => buildUcpCheckoutCompleteRequest(context, runtimeConfig, preparedComplete)),
      refreshPaymentMethods: preparedComplete.refreshPaymentMethods,
      dryRun: false
    });
    if (isDryRun3(refreshed.result)) {
      throw apiError("ucp-checkout run unexpectedly produced a dry-run complete response");
    }
    assertApiSuccess(refreshed.result.status, refreshed.result.body);
    complete = requireUcpCheckoutRunData(refreshed.result.body, "complete");
    assertUcpCheckoutRunResponseIdentity(complete, checkoutId, "complete");
    completeStatus = normalizedUcpCheckoutRunStatus(complete);
    orderId = consistentUcpCheckoutRunStageOrderId(createOrderId, ucpCheckoutRunOrderId(complete, "complete"));
  } catch (error) {
    if (!options2.returnSafeCompleteFailure) {
      throw error;
    }
    if (options2.readOnlyRecovery) {
      return recoverUcpCheckoutRun(context, {
        checkoutId,
        endpoint,
        create,
        ...createOrderId ? { fallbackOrderId: createOrderId } : {},
        initialCompleteError: safeWorkflowError(error),
        waitDelivery,
        maxWaitSeconds: options2.readOnlyRecovery.maxWaitSeconds
      }, options2.readOnlyRecovery);
    }
    return {
      stage: "complete",
      status: "unknown",
      checkoutId,
      endpoint,
      ...createOrderId ? { orderId: createOrderId } : {},
      attempts: {
        create: 1,
        complete: 1
      },
      create,
      paymentRetryAllowed: false,
      reconciliationRequired: true,
      resumeReadOnly: true,
      resumeCommand: buildUcpCheckoutReadResumeCommand(checkoutId, endpoint, context.globalOptions.format, context.runtimeConfig.baseUrl, void 0, context.executableName),
      error: safeWorkflowError(error)
    };
  }
  const commonOutput = {
    checkoutId,
    endpoint,
    ...orderId ? { orderId } : {},
    attempts: {
      create: 1,
      complete: 1
    },
    create,
    complete,
    ...refreshed.paymentMethodsRefreshWarning ? { paymentMethodsRefreshWarning: refreshed.paymentMethodsRefreshWarning } : {}
  };
  if (completeStatus !== "completed") {
    if (!isUcpCheckoutRunTerminalStatus(completeStatus) && options2.readOnlyRecovery) {
      return recoverUcpCheckoutRun(context, {
        checkoutId,
        endpoint,
        create,
        ...orderId ? { fallbackOrderId: orderId } : {},
        initialComplete: complete,
        ...refreshed.paymentMethodsRefreshWarning ? {
          paymentMethodsRefreshWarning: refreshed.paymentMethodsRefreshWarning
        } : {},
        waitDelivery,
        maxWaitSeconds: options2.readOnlyRecovery.maxWaitSeconds
      }, options2.readOnlyRecovery);
    }
    return {
      stage: "complete",
      status: completeStatus,
      ...commonOutput,
      ...isUcpCheckoutRunTerminalStatus(completeStatus) ? {} : {
        resumeCommand: buildUcpCheckoutReadResumeCommand(checkoutId, endpoint, context.globalOptions.format, context.runtimeConfig.baseUrl, void 0, context.executableName)
      }
    };
  }
  if (!waitDelivery) {
    return {
      stage: "complete",
      status: completeStatus,
      ...commonOutput
    };
  }
  if (!orderId) {
    return {
      stage: "complete",
      status: completeStatus,
      ...commonOutput,
      deliveryWait: {
        requested: true,
        started: false,
        reason: "completed checkout response is missing data.order.id"
      }
    };
  }
  const deliveryResult = await waitForUcpOrderDigitalDelivery(context, orderId, maxWaitSeconds);
  const deliveryStatus = deliveryResult.timedOut ? "timeout" : deliveryResult.deliveryStatus;
  return {
    stage: "delivery",
    status: deliveryStatus,
    ...commonOutput,
    orderId,
    attempts: {
      create: 1,
      complete: 1,
      delivery: deliveryResult.attempts
    },
    ready: deliveryResult.ready,
    timedOut: deliveryResult.timedOut,
    order: deliveryResult.order,
    delivery: ucpCheckoutRunDeliveryEvidence(deliveryResult),
    ...deliveryResult.nextRetryAt ? { nextRetryAt: deliveryResult.nextRetryAt } : {},
    ...deliveryResult.timedOut ? {
      resumeCommand: buildUcpOrderDeliveryResumeCommand(orderId, maxWaitSeconds, context.globalOptions.format, context.runtimeConfig.baseUrl, context.executableName)
    } : {}
  };
}
async function recoverUcpCheckoutRun(context, input, recovery) {
  const continuation = await continueUcpCheckoutReadOnly(context, {
    checkoutId: input.checkoutId,
    endpoint: input.endpoint,
    ...input.fallbackOrderId ? { fallbackOrderId: input.fallbackOrderId } : {},
    waitDelivery: input.waitDelivery,
    maxWaitSeconds: input.maxWaitSeconds,
    ...recovery.now ? { now: recovery.now } : {},
    ...recovery.sleep ? { sleep: recovery.sleep } : {}
  });
  const continuationAttempts = isJsonObject2(continuation.attempts) ? continuation.attempts : {};
  return {
    ...continuation,
    attempts: {
      create: 1,
      complete: 1,
      ...continuationAttempts
    },
    create: input.create,
    ...input.initialComplete ? { initialComplete: input.initialComplete } : {},
    ...input.initialCompleteError ? { initialCompleteError: input.initialCompleteError } : {},
    ...input.paymentMethodsRefreshWarning ? {
      paymentMethodsRefreshWarning: input.paymentMethodsRefreshWarning
    } : {},
    paymentRetryAllowed: false,
    reconciliationRequired: continuation.terminal === false
  };
}
async function continueUcpCheckoutReadOnly(context, input) {
  const now = input.now ?? Date.now;
  const startedAt = now();
  const wait = await waitForUcpCheckoutTerminal({
    checkoutId: input.checkoutId,
    maxWaitMs: input.maxWaitSeconds * 1e3,
    fetchCheckout: () => getCommandUcpCheckout(context, input.checkoutId, input.endpoint),
    ...input.now ? { now: input.now } : {},
    ...input.sleep ? { sleep: input.sleep } : {}
  });
  const common = {
    checkoutId: input.checkoutId,
    endpoint: input.endpoint,
    ...input.fallbackOrderId ? { orderId: input.fallbackOrderId } : {},
    checkout: wait.checkout,
    attempts: {
      checkoutRead: wait.attempts
    },
    paymentRetryAllowed: false
  };
  if (wait.timedOut) {
    return {
      stage: "complete",
      status: wait.status,
      terminal: false,
      timedOut: true,
      ...common,
      resumeReadOnly: true,
      ...wait.nextRetryAt ? { nextRetryAt: wait.nextRetryAt } : {},
      resumeCommand: buildUcpCheckoutReadResumeCommand(input.checkoutId, input.endpoint, context.globalOptions.format, context.runtimeConfig.baseUrl, {
        maxWaitSeconds: input.maxWaitSeconds,
        waitDelivery: input.waitDelivery
      }, context.executableName)
    };
  }
  if (wait.status !== "completed") {
    return {
      stage: "complete",
      status: wait.status,
      terminal: true,
      ...common
    };
  }
  const observedOrderId = ucpCheckoutRunOrderId(wait.checkout, "complete");
  const orderId = consistentUcpCheckoutRunStageOrderId(input.fallbackOrderId, observedOrderId);
  if (!input.waitDelivery) {
    return {
      stage: "complete",
      status: "completed",
      terminal: true,
      ...common,
      ...orderId ? { orderId } : {}
    };
  }
  if (!orderId) {
    return {
      stage: "complete",
      status: "completed",
      terminal: true,
      ...common,
      deliveryWait: {
        requested: true,
        started: false,
        reason: "completed checkout response is missing data.order.id"
      }
    };
  }
  const remainingMs = input.maxWaitSeconds * 1e3 - Math.max(0, now() - startedAt);
  if (remainingMs <= 0) {
    return {
      stage: "delivery",
      status: "timeout",
      terminal: false,
      timedOut: true,
      ready: false,
      ...common,
      resumeReadOnly: true,
      orderId,
      resumeCommand: buildUcpCheckoutReadResumeCommand(input.checkoutId, input.endpoint, context.globalOptions.format, context.runtimeConfig.baseUrl, {
        maxWaitSeconds: input.maxWaitSeconds,
        waitDelivery: true
      }, context.executableName)
    };
  }
  const deliveryResult = await waitForUcpOrderDigitalDelivery(context, orderId, Math.max(1, Math.floor(remainingMs / 1e3)));
  const deliveryStatus = deliveryResult.timedOut ? "timeout" : deliveryResult.deliveryStatus;
  return {
    stage: "delivery",
    status: deliveryStatus,
    terminal: !deliveryResult.timedOut,
    ...common,
    orderId,
    attempts: {
      checkoutRead: wait.attempts,
      delivery: deliveryResult.attempts
    },
    ready: deliveryResult.ready,
    timedOut: deliveryResult.timedOut,
    order: deliveryResult.order,
    delivery: ucpCheckoutRunDeliveryEvidence(deliveryResult),
    ...deliveryResult.nextRetryAt ? { nextRetryAt: deliveryResult.nextRetryAt } : {},
    ...deliveryResult.timedOut ? {
      resumeReadOnly: true,
      resumeCommand: buildUcpCheckoutReadResumeCommand(input.checkoutId, input.endpoint, context.globalOptions.format, context.runtimeConfig.baseUrl, {
        maxWaitSeconds: input.maxWaitSeconds,
        waitDelivery: true
      }, context.executableName)
    } : {}
  };
}
function ucpCheckoutRunDeliveryEvidence(result) {
  return isJsonObject2(result.order.digital_delivery) ? result.order.digital_delivery : { status: result.deliveryStatus };
}
function safeWorkflowError(error) {
  const value = error instanceof Error ? error : new Error(String(error));
  return {
    name: value.name,
    message: value.message.replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/giu, "Bearer [REDACTED]").replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[REDACTED_EMAIL]").replace(/((?:access|refresh|api|device)[_-]?token|api[_-]?key|secret|password)\s*[:=]\s*\S+/giu, "$1=[REDACTED]")
  };
}
async function ucpCheckoutCreate(context) {
  rejectUcpCheckoutUnsupportedFlags(context.args.flags);
  rejectUcpCheckoutRunOnlyFlags(context.args.flags);
  const prepared = prepareUcpCheckoutCreate(context);
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => buildUcpCheckoutCreateRequest(context, runtimeConfig, prepared));
  return finishApiCommand(result, context);
}
function prepareUcpCheckoutCreate(context, options2 = {}) {
  const flags = context.args.flags;
  const currency = requireStringFlag(flags, "missing --currency", "currency");
  const customerId = asRequiredString(context.storedConfig.customerId, "missing customerId; run `clink wallet init` or run `clink config set customer-id <customerId>`");
  const email = asRequiredString(context.storedConfig.email, "missing email; run `clink wallet init` or run `clink config set email <email>`");
  const buyer = withWalletStatusEmail(optionalJsonObjectFlag2(flags, "buyer"), email);
  const body = compact3({
    merchant_url: requireStringFlag(flags, "missing --merchant-url", "merchant-url"),
    merchant_name: getStringFlag(flags, "merchant-name"),
    merchant_category_code: requireStringFlag(flags, "missing --merchant-category-code", "merchant-category-code"),
    order_channel_id: getStringFlag(flags, "order-channel-id"),
    customer_id: customerId,
    context: { currency },
    buyer,
    line_items: normalizeUcpCheckoutCreateLineItems(requireJsonArrayFlag(flags, "line-items"), currency, options2.requireMajorUnitMoneyStrings === true),
    shipping_address: optionalJsonFlag(flags, "shipping-address"),
    metadata: optionalJsonFlag(flags, "metadata")
  });
  return {
    target: resolveUcpCheckoutRequestTarget(context, ""),
    body,
    idempotencyKey: randomUUID4()
  };
}
function buildUcpCheckoutCreateRequest(context, runtimeConfig, prepared) {
  return {
    ...prepared.target,
    method: "POST",
    headers: buildUcpCheckoutHeaders(runtimeConfig, prepared.target.baseUrl, prepared.idempotencyKey),
    body: prepared.body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  };
}
function buildUcpCheckoutRunDryRunPlan(input) {
  return {
    dryRun: true,
    command: "ucp-checkout run",
    sideEffects: false,
    confirmedPurchase: input.confirmedPurchase,
    endpoint: input.endpoint,
    retryPolicy: {
      create: "never",
      complete: "never"
    },
    steps: [
      {
        stage: "create",
        effect: "create_checkout",
        request: input.create.request
      },
      {
        stage: "complete",
        effect: "submit_payment",
        dependsOn: "create.data.id",
        exactlyOnce: true,
        request: {
          ...input.complete.request,
          url: input.complete.request.url.replace(/%7BcheckoutId%7D/giu, "{checkoutId}")
        }
      },
      {
        stage: "delivery",
        enabled: input.waitDelivery,
        readOnly: true,
        condition: "complete.data.status is completed and complete.data.order.id is present",
        maxWaitSeconds: input.maxWaitSeconds
      }
    ]
  };
}
function requireUcpCheckoutRunData(body, stage) {
  const data = unwrapApiData(body);
  if (!isJsonObject2(data)) {
    throw apiError(`ucp-checkout run ${stage} response data must be an object`, 502);
  }
  return data;
}
function requireUcpCheckoutRunCheckoutId(create) {
  const checkoutId = consistentUcpCheckoutRunId([create.id, create.checkoutId, create.checkout_id], "create");
  if (!checkoutId) {
    throw apiError("ucp-checkout run create response is missing data.id", 502);
  }
  return checkoutId;
}
function assertUcpCheckoutRunResponseIdentity(response, expectedCheckoutId, stage) {
  const checkoutId = consistentUcpCheckoutRunId([response.id, response.checkoutId, response.checkout_id], stage);
  if (!checkoutId) {
    throw apiError(`ucp-checkout run ${stage} response is missing Checkout ID`, 502);
  }
  if (checkoutId !== expectedCheckoutId) {
    throw apiError(`ucp-checkout run ${stage} response Checkout ID does not match the created Checkout`, 502);
  }
}
function consistentUcpCheckoutRunId(values, stage) {
  const present = values.filter((value) => value !== void 0);
  if (present.some((value) => typeof value !== "string" || !safeUcpCheckoutRunIdentifier(value))) {
    throw apiError(`ucp-checkout run ${stage} response has an invalid Checkout ID`, 502);
  }
  const unique = [...new Set(present.map((value) => value.trim()))];
  if (unique.length > 1) {
    throw apiError(`ucp-checkout run ${stage} response has conflicting Checkout IDs`, 502);
  }
  return unique[0];
}
function normalizedUcpCheckoutRunStatus(data) {
  return asOptionalString(data.status)?.trim().toLowerCase() || "unknown";
}
function isUcpCheckoutRunTerminalStatus(status) {
  return (/* @__PURE__ */ new Set([
    "cancelled",
    "canceled",
    "expired",
    "failed",
    "rejected",
    "requires_escalation"
  ])).has(status);
}
function ucpCheckoutRunOrderId(evidence, stage) {
  const ucp = evidence.ucp;
  if (ucp !== void 0 && !isJsonObject2(ucp)) {
    throw apiError(`ucp-checkout run ${stage} response has malformed data.ucp`, 502);
  }
  const order = evidence.order;
  if (order !== void 0 && !isJsonObject2(order)) {
    throw apiError(`ucp-checkout run ${stage} response has malformed data.order`, 502);
  }
  const aliases = [
    { name: "data.ucpOrderId", value: evidence.ucpOrderId },
    { name: "data.ucp_order_id", value: evidence.ucp_order_id },
    { name: "data.omsOrderId", value: evidence.omsOrderId },
    { name: "data.oms_order_id", value: evidence.oms_order_id },
    {
      name: "data.ucp.ucpOrderId",
      value: isJsonObject2(ucp) ? ucp.ucpOrderId : void 0
    },
    {
      name: "data.ucp.ucp_order_id",
      value: isJsonObject2(ucp) ? ucp.ucp_order_id : void 0
    },
    ...normalizedUcpCheckoutRunStatus(evidence) === "completed" ? [{
      name: "data.order.id",
      value: isJsonObject2(order) ? order.id : void 0
    }] : []
  ];
  if (aliases.some(({ value }) => value !== void 0 && (typeof value !== "string" || !safeUcpCheckoutRunIdentifier(value)))) {
    throw apiError(`ucp-checkout run ${stage} response has invalid or conflicting UCP Order IDs`, 502);
  }
  const resolution = resolveStrictIdentifierAliases(aliases);
  if (resolution.kind === "INVALID") {
    throw apiError(`ucp-checkout run ${stage} response has invalid or conflicting UCP Order IDs`, 502);
  }
  if (resolution.kind === "RESOLVED" && !safeUcpCheckoutRunIdentifier(resolution.value)) {
    throw apiError(`ucp-checkout run ${stage} response has invalid or conflicting UCP Order IDs`, 502);
  }
  return resolution.kind === "RESOLVED" ? resolution.value : void 0;
}
function safeUcpCheckoutRunIdentifier(value) {
  const normalized = value.trim();
  return normalized && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value) ? normalized : void 0;
}
function consistentUcpCheckoutRunStageOrderId(createOrderId, completeOrderId) {
  if (createOrderId && completeOrderId && createOrderId !== completeOrderId) {
    throw apiError("ucp-checkout run create and complete responses have conflicting UCP Order IDs", 502);
  }
  return completeOrderId ?? createOrderId;
}
function ucpCheckoutEndpointPrefix(target) {
  const url = new URL(target.path, target.baseUrl);
  const suffix = "/checkout-sessions";
  if (!url.pathname.endsWith(suffix)) {
    throw apiError("invalid UCP checkout request target", 500);
  }
  url.pathname = url.pathname.slice(0, -suffix.length);
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/u, "");
}
function buildUcpCheckoutReadResumeCommand(checkoutId, endpoint, format, baseUrlOverride, options2, executableName = MAIN_EXECUTABLE_NAME) {
  return preserveBaseUrlOverride([
    `${executableName} ucp-checkout get`,
    `--checkout-id ${quoteShellArgument(checkoutId)}`,
    `--endpoint ${quoteShellArgument(endpoint)}`,
    ...options2 ? [
      ...options2.waitDelivery ? ["--wait-delivery"] : [],
      `--max-wait ${options2.maxWaitSeconds}`
    ] : [],
    `--format ${format}`
  ].join(" "), canonicalWalletOriginForResume(baseUrlOverride));
}
function withWalletStatusEmail(buyer, email) {
  return {
    ...buyer ?? {},
    email
  };
}
async function ucpCheckoutGet(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
  if ("confirm-purchase" in flags) {
    throw validationError("--confirm-purchase is only supported by ucp-checkout run");
  }
  const checkoutId = requireCheckoutId(flags);
  const waitDelivery = getBooleanFlag(flags, "wait-delivery");
  const maxWait = getStringFlag(flags, "max-wait");
  if (!waitDelivery && maxWait === void 0) {
    const result = await requestCommandUcpCheckout(context, checkoutId);
    return finishApiCommand(result, context);
  }
  const maxWaitSeconds = parseIntFlag(maxWait, "--max-wait must be an integer of at least 1 second", 1) ?? DEFAULT_UCP_DELIVERY_WAIT_SECONDS;
  if (context.globalOptions.dryRun) {
    const result = await requestCommandUcpCheckout(context, checkoutId);
    return finishApiCommand(result, context);
  }
  const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}`);
  printSuccess(await continueUcpCheckoutReadOnly(context, {
    checkoutId,
    endpoint: ucpCheckoutReadEndpointPrefix(target, checkoutId),
    waitDelivery,
    maxWaitSeconds
  }), context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function requestCommandUcpCheckout(context, checkoutId) {
  const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}`);
  return requestOAuthBusinessJson(context, (runtimeConfig) => ({
    ...target,
    method: "GET",
    headers: buildCustomerApiKeyHeaders(runtimeConfig, target.baseUrl),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
}
async function getCommandUcpCheckout(context, checkoutId, endpoint) {
  const result = await requestCommandUcpCheckout({
    ...context,
    args: {
      positionals: ["ucp-checkout", "get"],
      flags: {
        "checkout-id": checkoutId,
        endpoint,
        format: context.globalOptions.format
      }
    }
  }, checkoutId);
  if (isDryRun3(result)) {
    throw apiError("ucp-checkout get unexpectedly produced a dry-run response");
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  if (!isJsonObject2(data)) {
    throw apiError("ucp-checkout get response data must be an object", 502);
  }
  return data;
}
function ucpCheckoutReadEndpointPrefix(target, checkoutId) {
  const url = new URL(target.path, target.baseUrl);
  const suffix = `/checkout-sessions/${encodeURIComponent(checkoutId)}`;
  if (!url.pathname.endsWith(suffix)) {
    throw apiError("invalid UCP checkout read target", 500);
  }
  url.pathname = url.pathname.slice(0, -suffix.length);
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/u, "");
}
async function ucpCheckoutUpdate(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
  rejectUcpCheckoutRunOnlyFlags(flags);
  const checkoutId = requireCheckoutId(flags);
  const lineItems = requireJsonArrayFlag(flags, "line-items");
  const currencyHint = "currency" in flags ? requireNonBlankFlag(flags, "currency", "missing --currency") : void 0;
  const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}`);
  const currency = await resolveUcpCheckoutUpdateCurrency(context, target, currencyHint);
  const body = compact3({
    line_items: normalizeUcpCheckoutUpdateLineItems(lineItems, currency),
    buyer: optionalJsonFlag(flags, "buyer"),
    shipping_address: optionalJsonFlag(flags, "shipping-address"),
    metadata: optionalJsonFlag(flags, "metadata")
  });
  const idempotencyKey = randomUUID4();
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    ...target,
    method: "PUT",
    headers: buildUcpCheckoutHeaders(runtimeConfig, target.baseUrl, idempotencyKey),
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function resolveUcpCheckoutUpdateCurrency(context, target, currencyHint) {
  if (context.globalOptions.dryRun) {
    if (!currencyHint) {
      throw validationError("ucp-checkout update --dry-run requires --currency because it does not fetch the checkout");
    }
    return currencyHint;
  }
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    ...target,
    method: "GET",
    headers: buildCustomerApiKeyHeaders(runtimeConfig, target.baseUrl),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: false
  }));
  if (isDryRun3(result)) {
    throw apiError("ucp-checkout get unexpectedly returned a dry-run response");
  }
  assertApiSuccess(result.status, result.body);
  const currency = extractUcpCheckoutCurrency(result.body);
  if (!currency) {
    throw apiError("ucp-checkout get response is missing currency");
  }
  if (currencyHint && currencyHint.toUpperCase() !== currency.toUpperCase()) {
    throw validationError(`--currency ${currencyHint} does not match checkout currency ${currency}`);
  }
  return currency;
}
function extractUcpCheckoutCurrency(body) {
  const checkout = unwrapApiData(body);
  if (!isRecord14(checkout)) {
    return void 0;
  }
  const direct = asOptionalString(checkout.currency)?.trim();
  if (direct) {
    return direct;
  }
  const checkoutContext = checkout.context;
  if (!isRecord14(checkoutContext)) {
    return void 0;
  }
  const contextual = asOptionalString(checkoutContext.currency)?.trim();
  return contextual || void 0;
}
async function ucpCheckoutComplete(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
  rejectUcpCheckoutRunOnlyFlags(flags);
  if ("credential-token" in flags) {
    throw validationError("--credential-token is not supported on external ucp-checkout complete; pass --payment-instrument-id");
  }
  const checkoutId = requireCheckoutId(flags);
  const prepared = await prepareUcpCheckoutComplete(context, checkoutId);
  const refreshed = await executePaymentRequestWithRefresh({
    request: () => requestOAuthBusinessJson(context, (runtimeConfig) => buildUcpCheckoutCompleteRequest(context, runtimeConfig, prepared)),
    refreshPaymentMethods: prepared.refreshPaymentMethods,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(refreshed.result, context, refreshed.paymentMethodsRefreshWarning);
}
async function prepareUcpCheckoutComplete(context, checkoutId) {
  const flags = context.args.flags;
  let paymentInstrumentId = getStringFlag(flags, "payment-instrument-id");
  if (!paymentInstrumentId) {
    paymentInstrumentId = await resolveDefaultPaymentInstrumentId(context);
  }
  const customerId = asRequiredString(context.storedConfig.customerId, "missing customerId; run `clink wallet init` or run `clink config set customer-id <customerId>`");
  const paymentMethodApi = createPaymentMethodApi(context);
  const card = await resolveUcpCheckoutCardContext(context, paymentMethodApi, paymentInstrumentId);
  const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}/complete`);
  return {
    target,
    body: buildUcpCheckoutCompleteBody(customerId, paymentInstrumentId, card),
    idempotencyKey: randomUUID4(),
    refreshPaymentMethods: paymentMethodApi.refreshPaymentMethods
  };
}
function buildUcpCheckoutCompleteRequest(context, runtimeConfig, prepared) {
  return {
    ...prepared.target,
    method: "POST",
    headers: buildUcpCheckoutHeaders(runtimeConfig, prepared.target.baseUrl, prepared.idempotencyKey),
    body: prepared.body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  };
}
async function resolveUcpCheckoutCardContext(context, paymentMethodApi, paymentInstrumentId) {
  const cached = getStoredPaymentMethods(context).map((item) => ({ ...item }));
  if (context.globalOptions.dryRun) {
    return toUcpCheckoutCardContext(findPaymentMethodById(cached, paymentInstrumentId));
  }
  try {
    const refreshedMethods = await paymentMethodApi.refreshPaymentMethods();
    return toUcpCheckoutCardContext(findPaymentMethodById(refreshedMethods, paymentInstrumentId) ?? findPaymentMethodById(cached, paymentInstrumentId));
  } catch {
    return toUcpCheckoutCardContext(findPaymentMethodById(cached, paymentInstrumentId));
  }
}
function findPaymentMethodById(items, paymentInstrumentId) {
  return items.find((item) => item.paymentInstrumentId === paymentInstrumentId);
}
function toUcpCheckoutCardContext(method) {
  if (!method) {
    return {};
  }
  const brand = typeof method.cardScheme === "string" ? method.cardScheme : method.cardBrand;
  return {
    ...typeof brand === "string" && brand.trim() ? { cardScheme: brand.trim() } : {},
    ...typeof method.visaRegistrationSucceeded === "boolean" ? { visaRegistrationSucceeded: method.visaRegistrationSucceeded } : {}
  };
}
function buildUcpCheckoutCompleteBody(customerId, paymentInstrumentId, card) {
  return {
    payment: {
      instruments: [
        {
          id: `${customerId}#${paymentInstrumentId}`,
          handler_id: "clink_pay",
          type: "card",
          selected: true,
          credential: {
            type: "PAYMENT_GATEWAY",
            token: paymentInstrumentId,
            ...card.cardScheme ? { card_scheme: card.cardScheme } : {},
            ...card.visaRegistrationSucceeded === void 0 ? {} : { visa_registration_succeeded: card.visaRegistrationSucceeded }
          }
        }
      ]
    }
  };
}
async function ucpCheckoutCancel(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
  rejectUcpCheckoutRunOnlyFlags(flags);
  const checkoutId = requireCheckoutId(flags);
  const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}/cancel`);
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    ...target,
    method: "POST",
    headers: buildCustomerApiKeyHeaders(runtimeConfig, target.baseUrl),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
function requireCheckoutId(flags) {
  return requireStringFlag(flags, "missing --checkout-id", "checkout-id");
}
function resolveUcpCheckoutRequestTarget(context, checkoutSessionsSuffix) {
  const endpoint = getStringFlag(context.args.flags, "endpoint") ?? getStringFlag(context.args.flags, "endpont");
  if (!endpoint) {
    return {
      baseUrl: context.runtimeConfig.baseUrl,
      path: `${UCP_EXTERNAL_CHECKOUT_PATH}${checkoutSessionsSuffix}`
    };
  }
  const endpointUrl = parseAbsoluteHttpUrl(endpoint, "--endpoint");
  if (endpointUrl.protocol !== "https:" || endpointUrl.username || endpointUrl.password || endpointUrl.search || endpointUrl.hash) {
    throw validationError("--endpoint must be an absolute HTTPS URL without credentials, query, or fragment");
  }
  const endpointPath = endpointUrl.pathname.replace(/\/+$/, "");
  return {
    baseUrl: endpointUrl.origin,
    path: `${endpointPath}/checkout-sessions${checkoutSessionsSuffix}`
  };
}
function parseAbsoluteHttpUrl(value, flagName) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw validationError(`${flagName} must be an absolute http(s) URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw validationError(`${flagName} must be an absolute http(s) URL`);
  }
  return parsed;
}
var EXTERNAL_CHECKOUT_MONEY_FIELDS = /* @__PURE__ */ new Set(["amount", "price"]);
var CURRENCY_FRACTION_DIGIT_CACHE = /* @__PURE__ */ new Map();
function normalizeUcpCheckoutCreateLineItems(lineItems, currency, requireMajorUnitMoneyStrings = false) {
  return lineItems.map((lineItem, index) => normalizeUcpCheckoutMoneyFields(lineItem, currency, `--line-items[${index}]`, false, requireMajorUnitMoneyStrings));
}
function normalizeUcpCheckoutUpdateLineItems(lineItems, currency) {
  return lineItems.map((lineItem, index) => normalizeUcpCheckoutMoneyFields(lineItem, currency, `--line-items[${index}]`, true));
}
function normalizeUcpCheckoutMoneyFields(value, currency, path4, preserveIntegerMinorUnits, requireMajorUnitMoneyStrings = false) {
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeUcpCheckoutMoneyFields(item, currency, `${path4}[${index}]`, preserveIntegerMinorUnits, requireMajorUnitMoneyStrings));
  }
  if (!isRecord14(value)) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => {
    const fieldPath = `${path4}.${key}`;
    if (EXTERNAL_CHECKOUT_MONEY_FIELDS.has(key) && requireMajorUnitMoneyStrings && typeof fieldValue !== "string") {
      throw validationError(`${fieldPath} must be a major-unit decimal string`);
    }
    if (EXTERNAL_CHECKOUT_MONEY_FIELDS.has(key) && shouldNormalizeUcpCheckoutMoneyInput(fieldValue, preserveIntegerMinorUnits)) {
      return [key, majorAmountToMinorUnits(fieldValue, currency, fieldPath)];
    }
    if (EXTERNAL_CHECKOUT_MONEY_FIELDS.has(key) && preserveIntegerMinorUnits && typeof fieldValue === "number" && Number.isInteger(fieldValue)) {
      validateMinorUnitInteger(fieldValue, fieldPath);
    }
    return [
      key,
      normalizeUcpCheckoutMoneyFields(fieldValue, currency, fieldPath, preserveIntegerMinorUnits, requireMajorUnitMoneyStrings)
    ];
  }));
}
function isRecord14(value) {
  return typeof value === "object" && value !== null;
}
function shouldNormalizeUcpCheckoutMoneyInput(value, preserveIntegerMinorUnits) {
  if (typeof value === "string") {
    return true;
  }
  return typeof value === "number" && (!preserveIntegerMinorUnits || !Number.isInteger(value));
}
function validateMinorUnitInteger(value, fieldPath) {
  if (!Number.isSafeInteger(value)) {
    throw validationError(`${fieldPath} is too large`);
  }
  if (value < 0) {
    throw validationError(`${fieldPath} must be a non-negative amount`);
  }
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
function rejectUcpCheckoutUnsupportedFlags(flags) {
  if ("instruction-id" in flags || "mandate-id" in flags) {
    throw validationError("--instruction-id and --mandate-id are not supported on ucp-checkout");
  }
  if ("idempotency-key" in flags) {
    throw validationError("--idempotency-key is generated by clink and cannot be provided");
  }
}
function rejectUcpCheckoutRunOnlyFlags(flags) {
  const runOnlyFlag = ["confirm-purchase", "wait-delivery", "max-wait"].find((name) => name in flags);
  if (runOnlyFlag) {
    throw validationError(`--${runOnlyFlag} is only supported by ucp-checkout run`);
  }
}
function buildUcpCheckoutHeaders(runtimeConfig, requestBaseUrl, idempotencyKey) {
  return {
    ...buildCustomerApiKeyHeaders(runtimeConfig, requestBaseUrl),
    "Idempotency-Key": idempotencyKey
  };
}
async function handleInstructionCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "instruction");
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
async function instructionBody(context) {
  const flags = context.args.flags;
  const isRecurring = getBooleanFlag(flags, "is-recurring");
  const mandates = normalizeInstructionMandates(await readInstructionMandates(flags), isRecurring, { requireCoreFields: true });
  const body = compact3({
    paymentInstrumentId: requireStringFlag(flags, "missing --payment-instrument-id", "payment-instrument-id"),
    title: requireNonBlankStringFlag(flags, "missing --title", "title"),
    description: getStringFlag(flags, "description"),
    effectiveUntilTime: utcDateTimeFlag(flags, "effective-until-time"),
    extra: optionalJsonFlag(flags, "extra"),
    mandates
  });
  if (isRecurring) {
    body.isRecurring = true;
  }
  const shippingAddress = optionalJsonObjectFlag2(flags, "shipping-address");
  if (shippingAddress !== void 0) {
    body.shippingAddress = shippingAddress;
  }
  return body;
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
  const body = await instructionBody(context);
  const staleEventCutoffMs = Date.now();
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: INSTRUCTION_PATH2,
    headers: buildInstructionHeaders(runtimeConfig),
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  if (isDryRun3(result)) {
    printSuccess(result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  const instructionId = asRequiredString(data.instructionId, "missing instructionId in instruction create response");
  const paymentInstrumentId = asOptionalString(data.paymentInstrumentId) ?? body.paymentInstrumentId;
  const mandateIds = extractMandateIds(data);
  const passkeyUrl = buildAgentPasskeyUrl(agentBaseUrl, paymentInstrumentId, instructionId, context.runtimeConfig.email);
  await openPortalWithBrowserHandoff(context, passkeyUrl);
  printSuccess({
    ...data,
    action: "created",
    instructionId,
    paymentInstrumentId,
    ...mandateIds.length > 0 ? { mandateIds } : {},
    requiresPasskey: true,
    passkeyUrl
  }, context.globalOptions.format);
  await maybeWatchEvents(context, passkeyUrl, "purchase instruction authorization", {
    eventType: "purchase_instruction.activated",
    expectedResource: { instructionId, purchaseInstructionId: instructionId },
    staleEventCutoffMs,
    ackUnmatchedEvents: false
  });
  return EXIT_CODES.OK;
}
async function openPortalWithBrowserHandoff(context, targetUrl) {
  const launch = await openBrowserHandoff({
    open: context.globalOptions.open && !context.globalOptions.dryRun,
    targetUrl,
    portalOrigin: resolveAgentBaseUrl(context.runtimeConfig.baseUrl),
    runtimeConfig: context.runtimeConfig,
    ...context.runtimeConfig.email ? { email: context.runtimeConfig.email } : {},
    request: (request) => requestBrowserHandoff(context, request),
    openBrowser: (url) => openBrowserWithResult(true, url)
  });
  await launch.completion;
  return launch.browserLaunch;
}
async function requestBrowserHandoff(context, request) {
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => {
    if (!runtimeConfig.authorization) {
      throw authError("Browser handoff requires Agent OAuth.");
    }
    return {
      baseUrl: runtimeConfig.baseUrl,
      method: "POST",
      path: request.path,
      headers: buildCustomerHeaders(runtimeConfig),
      body: request.body,
      timeoutMs: context.globalOptions.timeoutMs,
      dryRun: false
    };
  });
  if (isDryRun3(result)) {
    throw apiError("Browser handoff is unavailable during dry-run.");
  }
  return result;
}
async function instructionGet(context) {
  const instructionId = requireStringFlag(context.args.flags, "missing --purchase-instruction-id", "purchase-instruction-id");
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "GET",
    path: `${INSTRUCTION_PATH2}/${encodeURIComponent(instructionId)}`,
    headers: buildInstructionHeaders(runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function instructionSignUrl(context) {
  const flags = context.args.flags;
  const paymentInstrumentId = requireStringFlag(flags, "missing --payment-instrument-id", "payment-instrument-id");
  const instructionId = requireStringFlag(flags, "missing --purchase-instruction-id", "purchase-instruction-id");
  const url = buildAgentPasskeyUrl(resolveAgentBaseUrl(context.runtimeConfig.baseUrl), paymentInstrumentId, instructionId, context.runtimeConfig.email);
  const staleEventCutoffMs = Date.now();
  const browserLaunch = await openPortalWithBrowserHandoff(context, url);
  printSuccess({
    url,
    instructionId,
    paymentInstrumentId,
    manualOpenUrl: url,
    browserLaunch
  }, context.globalOptions.format);
  await maybeWatchEvents(context, url, "purchase instruction authorization", {
    eventType: "purchase_instruction.activated",
    expectedResource: { instructionId, purchaseInstructionId: instructionId },
    staleEventCutoffMs,
    ackUnmatchedEvents: false
  });
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
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "GET",
    path: INSTRUCTION_PATH2,
    headers: buildInstructionHeaders(runtimeConfig),
    query: { status, paymentInstrumentId },
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  if (!validOnly || isDryRun3(result)) {
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
  if (!isRecord14(data)) {
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
    if (!isRecord14(instruction) || normalizedString(instruction.status) !== "ACTIVE") {
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
  return isRecord14(mandate) && isZeroLike(mandate.reserveStatus);
}
function isZeroLike(value) {
  return value === 0 || value === "0" || value === false;
}
function normalizedString(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}
async function instructionAgentPageUrl(context) {
  const url = resolveAgentBaseUrl(context.runtimeConfig.baseUrl);
  const staleEventCutoffMs = Date.now();
  maybeOpenBrowser(context.globalOptions.open, url);
  printSuccess({ url }, context.globalOptions.format);
  await maybeWatchEvents(context, url, "purchase instruction change", { staleEventCutoffMs });
  return EXIT_CODES.OK;
}
async function handleConfigCommand(subcommand, context) {
  if (!subcommand) {
    printContextHelp(context, "config");
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
    throw validationError("usage: clink config set <key> <value>");
  }
  const key = normalizeConfigKey(rawKey);
  const value = parseConfigValue(key, rawValue);
  const nextConfig = await updateStoredConfig((current) => {
    setConfigValue(current, key, value, context.configLifecycle);
    return current;
  });
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
    throw validationError("usage: clink config unset <key>");
  }
  const key = normalizeConfigKey(rawKey);
  const nextConfig = await updateStoredConfig((current) => {
    if (key === "baseUrl" || key === "defaultOpenLinks") {
      setConfigValue(current, key, defaultValueForRequiredKey(key), context.configLifecycle);
    } else {
      unsetConfigValue(current, key);
    }
    return current;
  });
  printSuccess(buildConfigView(nextConfig), context.globalOptions.format);
  return EXIT_CODES.OK;
}
function defaultValueForRequiredKey(key) {
  return key === "baseUrl" ? DEFAULT_BASE_URL : false;
}
function setConfigValue(target, key, value, configLifecycle) {
  if (isCustomerConfigKey(key)) {
    switch (key) {
      case "customerId":
        if (target.oauthRequired || target.authorization) {
          throw configError("customer-id is managed by OAuth; use wallet init to change wallets");
        }
        if (target.customerId !== value) {
          delete target.paymentMethods;
          delete target.riskRules;
        }
        target.customerId = value;
        return;
      case "customerApiKey":
        throw configError("customer-api-key cannot be set in local config; use wallet init for OAuth");
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
    case "baseUrl": {
      const previousBaseUrl = target.baseUrl;
      if (!sameHttpOrigin(target.baseUrl, value)) {
        delete target.authorization;
        delete target.customerApiKey;
        delete target.paymentMethods;
        delete target.riskRules;
      }
      target.baseUrl = value;
      configLifecycle.afterBaseUrlChange?.(previousBaseUrl, target);
      return;
    }
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
      if (target.authorization) {
        throw configError("customer-id is managed by OAuth; log out before removing local wallet metadata");
      }
      delete target.customerId;
      delete target.paymentMethods;
      delete target.riskRules;
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
  const authorization = config.authorization;
  return {
    baseUrl: config.baseUrl,
    customerId: config.customerId ?? null,
    email: config.email ?? null,
    name: config.name ?? null,
    hasAuthorization: Boolean(authorization),
    authorizationType: authorization ? "oauth" : config.customerApiKey ? "csk" : null,
    accessTokenExpiresAt: authorization ? new Date(authorization.accessTokenExpiresAt).toISOString() : null,
    refreshTokenExpiresAt: authorization ? new Date(authorization.refreshTokenExpiresAt).toISOString() : null,
    agentClientId: authorization?.agentClientId ?? null,
    visaRegistrationStatus: authorization?.visaRegistrationStatus ?? null,
    hasCustomerApiKey: Boolean(config.customerApiKey),
    oauthRequired: Boolean(config.oauthRequired || authorization),
    defaultOpenLinks: config.defaultOpenLinks,
    configPath: "~/.clink-cli/config.json"
  };
}
async function cachePaymentMethods(context, value) {
  const requestedIdentity = runtimeAuthorizationIdentity(context.runtimeConfig);
  if (!Array.isArray(value) || !value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item) && typeof item.paymentInstrumentId === "string" && item.paymentInstrumentId.trim().length > 0)) {
    throw apiError("invalid card binding response: missing or invalid paymentMethodsVoList", 502);
  }
  const paymentMethods = value;
  const nextConfig = await updateStoredConfig((current) => {
    const currentIdentity = runtimeAuthorizationIdentity(resolveRuntimeConfig(current, context.args.flags));
    if (requestedIdentity.type === "none" || !storedConfigCanCacheForIdentity(current, requestedIdentity) || !authorizationIdentityCanContinue(requestedIdentity, currentIdentity)) {
      throw authError("Authentication changed while payment methods were refreshing; retry the command.");
    }
    current.paymentMethods = paymentMethods.map((item) => ({ ...item }));
    return current;
  });
  context.storedConfig = nextConfig;
  context.runtimeConfig = resolveRuntimeConfig(nextConfig, context.args.flags);
  return nextConfig.paymentMethods?.length ?? 0;
}
function getStoredPaymentMethods(context) {
  return Array.isArray(context.storedConfig.paymentMethods) ? context.storedConfig.paymentMethods : [];
}
function stringifyRefreshError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}
async function finishApiCommand(result, context, paymentMethodsRefreshWarning) {
  if (isDryRun3(result)) {
    printSuccess(result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  printSuccess(paymentMethodsRefreshWarning && isRecord14(data) && !Array.isArray(data) ? addPaymentMethodsRefreshWarning(data, paymentMethodsRefreshWarning) : data, context.globalOptions.format);
  return EXIT_CODES.OK;
}
async function finishPublicCatalogCommand(result, context) {
  if (isDryRun3(result)) {
    printSuccess(result, context.globalOptions.format);
    return EXIT_CODES.OK;
  }
  assertPublicCatalogApiSuccess(result.status, result.body);
  printSuccess(unwrapApiData(result.body), context.globalOptions.format);
  return EXIT_CODES.OK;
}
function assertPublicCatalogApiSuccess(status, body) {
  if (status < 200 || status >= 300) {
    throw apiError(extractMessage(body) ?? `request failed with status ${status}`, status);
  }
  if (typeof body !== "object" || body === null || !("code" in body)) {
    return;
  }
  const code = Number(body.code);
  if (!Number.isNaN(code) && code !== 200) {
    throw apiError(extractMessage(body) ?? `request failed with code ${code}`, code);
  }
}
function createPaymentMethodApi(context) {
  const getRuntimeConfig = createRuntimeConfigLoader(context);
  const refreshRuntimeConfig = createRuntimeConfigRefresher(context);
  return createTipAuthorizationApi({
    runtimeConfig: context.runtimeConfig,
    getRuntimeConfig,
    resolveStoredRuntimeConfig: (storedConfig) => resolveRuntimeConfig(storedConfig, context.args.flags),
    refreshRuntimeConfig,
    storedConfig: context.storedConfig,
    setStoredConfig: (storedConfig) => {
      context.storedConfig = storedConfig;
      context.runtimeConfig = resolveRuntimeConfig(storedConfig, context.args.flags);
    },
    timeoutMs: context.globalOptions.timeoutMs,
    watch: false,
    now: Date.now,
    onPasskeyUrl: () => {
    }
  });
}
function isDryRun3(value) {
  return "dryRun" in value;
}
function parseTimeout(value) {
  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw validationError("timeout must be a positive number of milliseconds");
  }
  return timeoutMs;
}
function optionalJsonFlag(flags, name) {
  const value = getStringFlag(flags, name);
  if (value === void 0) {
    return void 0;
  }
  return parseJsonFlag(value, `--${name}`);
}
function optionalJsonObjectFlag2(flags, name) {
  const value = getStringFlag(flags, name);
  if (value === void 0) {
    return void 0;
  }
  const parsed = parseJsonFlag(value, `--${name}`);
  if (!isJsonObject2(parsed)) {
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
function isJsonObject2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function compact3(value) {
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
  return instruction[mandateKey].map((mandate) => isRecord14(mandate) ? extractMandateId(mandate) : void 0).filter((mandateId) => mandateId !== void 0);
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

// dist/entrypoint.js
var MAIN_HELP_COMMANDS = [
  "wallet",
  "card",
  "risk",
  "skills",
  "pay",
  "refund",
  "ucp-checkout",
  "ucp-catalog",
  "ucp-merchant",
  "catalog",
  "ucp-order",
  "instruction",
  "events",
  "tool",
  "config"
];
async function runEntrypoint(runner, argv, helpCommands, executableName = MAIN_EXECUTABLE_NAME) {
  try {
    const exitCode = await runner(argv);
    process.exitCode = exitCode;
  } catch (error) {
    process.exitCode = printError(error, detectErrorPresentation(argv, helpCommands, executableName));
  }
}
function detectErrorPresentation(argv, helpCommands, executableName) {
  const format = detectFormat(argv);
  const explicitFormat = hasExplicitFormat(argv);
  const helpHint = detectHelpHint(argv, helpCommands, executableName);
  return {
    format,
    explicitFormat,
    executableName,
    ...!explicitFormat && helpHint ? { helpHint } : {}
  };
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
function detectHelpHint(argv, helpCommands, executableName) {
  const command = argv.find((token) => !token.startsWith("-"));
  if (!command) {
    return `Run \`${executableName} --help\`.`;
  }
  if (helpCommands.includes(command)) {
    return `Run \`${executableName} ${command} --help\`.`;
  }
  return `Run \`${executableName} --help\`.`;
}

// dist/index.js
void runEntrypoint(runCli, process.argv.slice(2), MAIN_HELP_COMMANDS);
