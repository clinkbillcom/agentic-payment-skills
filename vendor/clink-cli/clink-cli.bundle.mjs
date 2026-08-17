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
    var path3 = __require("node:path");
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
          const localBin = path3.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path3.extname(baseName))) return void 0;
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
          executableDir = path3.resolve(
            path3.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path3.basename(
              this._scriptPath,
              path3.extname(this._scriptPath)
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
        launchWithNode = sourceExt.includes(path3.extname(executableFile));
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
        this._name = path3.basename(filename, path3.extname(filename));
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
      executableDir(path4) {
        if (path4 === void 0) return this._executableDir;
        this._executableDir = path4;
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
    function openPromise2(path3, options2) {
      return new Promise((resolve4, reject) => {
        open5(path3, { ...options2, lazyEntries: true }, function(err, zipfile) {
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
    function open5(path3, options2, callback) {
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
      fs.open(path3, "r", function(err, fd) {
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
function installError(message) {
  return new CliError("install_error", message, EXIT_CODES.INSTALL);
}

// dist/args.js
var OPTION_DEFINITIONS = [
  { name: "help", flags: "-h, --help" },
  { name: "format", flags: "--format <format>" },
  { name: "dry-run", flags: "--dry-run" },
  { name: "all", flags: "--all" },
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
var COMPLETE_HANDOFF_PATH = "/oauth/cli-handoff/complete";
var HANDOFF_PAGE_PREFIX = "/oauth/cli-handoff/";
var MAX_HANDOFF_LIFETIME_SECONDS = 300;
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
      completeUrl: buildCompleteUrl(target.portalOrigin, createResult.handoffId)
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
  const expiresIn = Number(data.expires_in);
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > MAX_HANDOFF_LIFETIME_SECONDS) {
    throw new Error("invalid create response");
  }
  const actual = new URL(browserUrl);
  const expected = new URL(`${HANDOFF_PAGE_PREFIX}${encodeURIComponent(handoffId)}`, portalOrigin);
  if (actual.origin !== expected.origin || actual.pathname !== expected.pathname || actual.search || actual.hash || actual.username || actual.password) {
    throw new Error("invalid create response");
  }
  return { handoffId, browserUrl: actual.toString(), expiresIn };
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
function buildCompleteUrl(portalOrigin, handoffId) {
  const complete = new URL(COMPLETE_HANDOFF_PATH, portalOrigin);
  complete.searchParams.set("handoff_id", handoffId);
  return complete.toString();
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
var MERCHANT_LIST_URLS = {
  production: "https://www.clinkbill.com/.well-known/ucp-merchants.json"
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
function resolveSelectedEnvironment(flags) {
  const sandbox = getBooleanFlag(flags, "sandbox");
  const test = getBooleanFlag(flags, "test");
  if (sandbox && test) {
    throw validationError("--sandbox and --test cannot be used together");
  }
  const explicitEnvironment = sandbox ? "sandbox" : test ? "test" : void 0;
  const distributionEnvironment = walletInitDistributionEnvironment();
  if (explicitEnvironment && distributionEnvironment && explicitEnvironment !== distributionEnvironment) {
    throw validationError(`wallet init environment is fixed to ${distributionEnvironment} by this CLI distribution`);
  }
  return explicitEnvironment ?? distributionEnvironment;
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
var CLI_VERSION = "0.2.13";

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
  const headers = {
    Accept: "application/json",
    "Accept-Language": "en-US",
    ...options2.headers ?? {}
  };
  if (options2.body !== void 0) {
    headers["Content-Type"] = "application/json";
  }
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
    throw networkError(error.message);
  } finally {
    clearTimeout(timeout);
  }
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
var LOGIN_REQUIRED_MESSAGE = "Login required; run `clink wallet init` to sign in.";
var BROWSER_OPEN_FAILURE_MESSAGE = "Could not open a browser automatically. Open the URL above in any browser.";
var BROWSER_OPEN_COMMAND_TIMEOUT_MS = 5e3;
var BROWSER_OPEN_COMMAND_TERMINATION_GRACE_MS = 250;
function buildCustomerHeaders(config, requestBaseUrl = config.baseUrl) {
  if (config.authorization) {
    assertAuthorizationRequestOrigin(config, requestBaseUrl);
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
  return {
    "X-Customer-ID": config.customerId,
    "X-Customer-API-Key": config.customerApiKey,
    "X-Timestamp": Date.now().toString()
  };
}
function buildCustomerApiKeyHeaders(config, requestBaseUrl = config.baseUrl) {
  if (config.authorization) {
    assertAuthorizationRequestOrigin(config, requestBaseUrl);
    return {
      Authorization: `${config.authorization.tokenType} ${config.authorization.accessToken}`
    };
  }
  if (!config.customerApiKey) {
    throw configError(LOGIN_REQUIRED_MESSAGE);
  }
  return {
    "X-Customer-API-Key": config.customerApiKey,
    "X-Timestamp": Date.now().toString()
  };
}
function buildInstructionHeaders(config, requestBaseUrl = config.baseUrl) {
  return buildCustomerApiKeyHeaders(config, requestBaseUrl);
}
function assertAuthorizationRequestOrigin(config, requestBaseUrl) {
  if (config.authorization && !sameHttpOrigin(config.authorization.issuerOrigin, requestBaseUrl)) {
    throw configError("saved OAuth authorization belongs to a different API environment; run `clink wallet init` for the selected wallet environment");
  }
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
function resolveBrowserOpenCommand(platform, url) {
  return resolveBrowserOpenCommands(platform, url)[0];
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
  const commands = resolveBrowserOpenCommands(options2.platform ?? process.platform, url);
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
function resolveBrowserOpenCommands(platform, url) {
  if (platform === "darwin") {
    return [{ executable: "open", args: [url] }];
  }
  if (platform === "win32") {
    return [
      {
        executable: "rundll32.exe",
        args: ["url.dll,FileProtocolHandler", url]
      },
      {
        executable: "explorer.exe",
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
      ...options2.checkoutId ? { selectors: { checkoutId: options2.checkoutId } } : {}
    },
    timeoutMs: options2.timeoutMs,
    dryRun: false
  }));
  if ("dryRun" in result) {
    return [];
  }
  assertApiSuccess(result.status, result.body);
  const data = unwrapApiData(result.body);
  const records = typeof data === "object" && data !== null ? data.records : void 0;
  if (!Array.isArray(records)) {
    throw apiError("invalid Event Hub poll response: expected data.records to be an array", 502);
  }
  if (!records.every(isWebhookEventRecord)) {
    throw apiError("invalid Event Hub poll response: expected every record to contain non-empty eventId and eventType", 502);
  }
  return records;
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
  const checkoutEventType = [...requestedTypes][0];
  if (hasCheckoutFilter && (requestedTypes.size !== 1 || checkoutEventType !== "agent_order.succeeded" && checkoutEventType !== "agent_order.failed")) {
    throw new CliError("validation_error", "checkoutId requires exactly one agent_order.succeeded or agent_order.failed event type", 2);
  }
  const hasResourceFilter = Object.values(options2.expectedResource ?? {}).some((value) => normalizedValue(value) !== void 0);
  const matchesExpectedResource = (event) => !hasResourceFilter || eventMatchesExpectedResource(event, options2.expectedResource ?? {});
  const matchesTarget = (event, sourceRecord) => (!hasTypeFilter || matchesRequestedType(event)) && (!hasCheckoutFilter || recordMatchesCheckoutId(sourceRecord, checkoutId)) && matchesExpectedResource(event);
  const runtimeState = { value: options2.runtimeConfig };
  const getRuntimeConfig = trackRuntimeConfigLoader(runtimeState, options2.getRuntimeConfig);
  const refreshRuntimeConfig = trackRuntimeConfigRefresher(runtimeState, options2.refreshRuntimeConfig);
  const collected = [];
  const ackedEventIds = [];
  const targetReached = () => collected.length > 0;
  const deadline = now() + maxDurationMs;
  for (; ; ) {
    const records = await pollWebhookEvents({
      runtimeConfig: runtimeState.value,
      ...getRuntimeConfig ? { getRuntimeConfig } : {},
      ...refreshRuntimeConfig ? { refreshRuntimeConfig } : {},
      timeoutMs: options2.timeoutMs,
      ...options2.pageSize !== void 0 ? { pageSize: options2.pageSize } : {},
      ...hasCheckoutFilter ? { eventTypes: [...requestedTypes], checkoutId } : {}
    });
    const polledIdentity = runtimeAuthorizationIdentity(runtimeState.value);
    if (records.length > 0) {
      const events = await processEvents(records, polledIdentity, options2.resolveStoredRuntimeConfig);
      const matchingEvents = events.filter((event, index) => matchesTarget(event, records[index]));
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
      if (targetReached()) {
        return { ready: true, timedOut: false, events: collected, ackedEventIds };
      }
    }
    if (now() + pollIntervalMs >= deadline) {
      break;
    }
    await sleep3(pollIntervalMs);
  }
  return { ready: false, timedOut: true, events: collected, ackedEventIds };
}
function recordMatchesCheckoutId(record, expectedCheckoutId) {
  const data = strictPayloadData(record?.payload);
  if (!data) {
    return false;
  }
  return resolvedTypedIdentifierAliases([data.checkoutId, data.checkout_id]) === expectedCheckoutId;
}
function strictPayloadData(payload) {
  if (!payload) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const data = parsed.data;
    return typeof data === "object" && data !== null && !Array.isArray(data) ? data : null;
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
  catalog           Search catalogs across merchants without naming one
  ucp-order         Query UCP orders by ID or list them by status and time range
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
  --customer-id <id>            Override customer ID
  --customer-api-key <key>      Legacy API key override for never-OAuth wallets only
  --timeout <ms>                Request timeout in milliseconds
  --help, -h                    Show help

Wallet Environment:
  Select an official environment with wallet init: --sandbox uses sandbox and --test uses test.
  The main distribution uses production when neither is present; packaged distributions may fix
  their wallet-init environment internally. Successful initialization saves the environment, and
  later commands use it without --sandbox or --test. CLINK_BASE_URL remains an advanced process override.

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
  clink catalog search --query "iced latte" --format json
  clink ucp-checkout get --checkout-id chk_xxx
  clink ucp-order get --order-id order_xxx
  clink ucp-order list --status paid --start-time 2026-07-01T00:00:00Z
  clink tool item-id --url https://shop.example/products/t-shirt?variant=123
  clink refund create --order-id order_xxx

More Help:
  clink wallet --help
  clink card --help
  clink skills --help
  clink ucp-catalog --help
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
  get-merchant-list  Return the supported merchant-list document for the configured environment

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  Reads the merchant list for the configured environment, normally saved by wallet init.
  get-merchant-list returns the document; get-endpoint generates an endpoint from the effective API
  base. Production is fetched on every call; sandbox/UAT and test use their bundled lists.
  A product domain outside that list returns error_code "NOT_IN_INTERNAL_UCP_LIST".

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
  Production fetches its merchant list from https://www.clinkbill.com/.well-known/ucp-merchants.json
  on every call and never caches it, so upstream merchant changes apply without a new CLI release.
  Sandbox/UAT and test use the lists bundled from public/uat and public/test with no request.
  A merchant entry with "enabled": false is treated as absent.
  Missing domains return error_code "NOT_IN_INTERNAL_UCP_LIST" with exit code 0.
  A production merchant-list request that fails, times out, or does not return JSON is a network
  error (exit 6) and is never reported as a missing merchant.
  CLINK_UCP_MERCHANTS_URL overrides the list source for any environment.

Examples:
  clink tool internal-ucp get-endpoint --product-url https://shop.example.com/products/demo --format pretty
  clink tool internal-ucp get-endpoint --product-url https://uebmaw-it.myshopify.com/products/demo --format pretty
`;
var TOOL_INTERNAL_UCP_GET_MERCHANT_LIST_HELP = `clink tool internal-ucp get-merchant-list

Usage:
  clink tool internal-ucp get-merchant-list [options]

Options:
${TOOL_NETWORK_OPTIONS}

Behavior:
  Returns the complete merchant-list document after validating its merchant entries.
  The environment normally comes from wallet init; CLINK_BASE_URL can override it for the process.
  Production fetches https://www.clinkbill.com/.well-known/ucp-merchants.json on every call.
  Sandbox/UAT and test read their lists bundled from public/uat and public/test without a request.
  The output preserves list metadata, descriptions, enabled flags, and disabled entries.
  CLINK_UCP_MERCHANTS_URL overrides the list source for any environment.

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
  --title <text>               Purchase intent title; enables the quick-instruction context
  --mandates <json>            JSON array of mandates; required with any quick-instruction flag
  --description <text>         Optional quick-instruction description
  --is-recurring               Mark the quick instruction as recurring (mandates need recurringFrequency)
  --shipping-address <json>    Optional shipping address JSON for the quick instruction
  --effective-until-time <utc> Optional quick-instruction expiry, UTC yyyy-MM-dd HH:mm:ss
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
  Passing any quick-instruction flag sends an instruction_context with the Device Authorization
  request; --title and --mandates are then required. --payment-instrument-id and --extra are not
  accepted here. After the browser authorization completes, the server creates a purchase
  instruction in PENDING state and the output includes its pendingInstructionId (null when the
  server skips creation, e.g. the wallet already has a VIC-registered card, or creation failed).
  The PENDING instruction activates automatically after VIC card binding completes and emits
  purchase_instruction.activated; it never appears in \`instruction list --valid-only\` until then.

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
    --mandates '[{"description":"Running shoes order","amountLimit":25.5,"currencyCode":"USD"}]'
`;
var WALLET_LOGOUT_HELP = `clink wallet logout

Usage:
  clink wallet logout [options]

Behavior:
  Best-effort revokes the current OAuth Refresh Token, then removes both OAuth credentials
  and any legacy customer API key from local config. Customer metadata and caches are retained.

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
  clink card list [options]
  clink card get --payment-instrument-id <id> [options]

Subcommands:
  binding-link   Fetch raw binding link and refresh cached payment methods
  setup-link     Fetch payment method setup link and refresh cached payment methods
  modify-link    Fetch payment method modify link and refresh cached payment methods
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
  --payment-instrument-id <id> Payment instrument to charge; defaults to the cached default card
  --instruction-id <id>          VIC purchase instruction ID sent as instruction_id
  --purchase-instruction-id <id> Backward-compatible alias for --instruction-id
  --mandate-id <id>              VIC mandate ID sent as mandate_id
  --shipping-address <json>      UCP Postal Address JSON object sent as shippingaddress
  --products <json>              Product list JSON array for aiAgentInstructionBo.products

Options:
  --payment-method-type <type> Payment method type, defaults to CARD
${CUSTOMER_REQUEST_OPTIONS}

Notes:
  If --payment-instrument-id is omitted, pay uses the default cached payment method from local config.
  Refresh cached payment methods with clink card binding-link when needed.
  For VIC-routed charge, pass instruction_id and mandate_id via --instruction-id and --mandate-id.
  For shipped physical goods, pass --shipping-address as UCP Postal Address JSON:
  street_address, extended_address, address_locality, address_region, address_country,
  postal_code, first_name, last_name, and phone_number.
  For product-level VIC credential context, pass --products as a JSON array with productId,
  productName, productUrl, quantity, unitPrice, currencyCode, and optional extra.
  Old agent pay always sends aiAgentInstructionBo.merchantInfo.merchantCategoryCode = 5999.

Examples:
  clink pay --merchant-id merchant_xxx --amount 10 --currency USD --payment-instrument-id pi_xxx
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
  clink ucp-checkout <create|get|update|cancel|complete> [options]

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
  --currency <currency>           Checkout currency for create; update validation/dry-run hint
  --line-items <json>             UCP line_items JSON array for create/update
  --buyer <json>                  UCP buyer JSON object for create/update
  --shipping-address <json>       Shipping address JSON object for create/update
  --metadata <json>               Metadata JSON object for create/update
  --payment-instrument-id <id>    Payment instrument ID for complete; defaults to the cached default card
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
  A completed get/complete response carries the OMS/UCP order ID in data.order.id. Pass that exact
  value to ucp-order get; do not infer the ID kind from an order_ prefix. agent_order event
  resourceId, data.orderId, and data.paymentOrderId are Clink Payment order IDs, not UCP order IDs.

Examples:
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
  --context <json>            UCP Catalog context JSON object. Fields:
                              - address_country: ISO 3166-1 alpha-2 context hint (e.g., "SG", "HK")
                              - language: IETF BCP 47 language tag (e.g., "en", "zh-Hans")
                              - currency: ISO 4217 code (e.g., "USD", "HKD")
  --filters <json>            UCP Catalog filters JSON object; prices use minor units
  --signals <json>            UCP Catalog signals JSON object
  --attribution <json>        UCP Catalog attribution JSON object
  --cursor <cursor>           Pagination cursor from a previous response
  --limit <n>                 Page size from 1 to 100; server default is 10
  --request-id <id>           Request-Id header; defaults to a generated UUID
  --ucp-agent <value>         UCP-Agent header; defaults to clink-cli

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Behavior:
  Sends POST /agent/ucp/{merchantId}/catalog/search using the environment saved by wallet init.
  OAuth wallets use Bearer authentication with automatic 401 refresh; never-OAuth wallets use
  their legacy customer API key. Request-Id remains stable if an OAuth retry occurs.

Examples:
  clink ucp-catalog search --merchant-id merchant_xxx --query keyboard --format json
  clink ucp-catalog search     --merchant-id merchant_xxx --query watch     --context '{"currency":"USD","language":"en-US"}'     --filters '{"price":{"min":1000,"max":50000},"offer_types":["one_time"]}'     --limit 10 --format pretty
`;
var UCP_CATALOG_PRODUCT_HELP = `clink ucp-catalog product

Usage:
  clink ucp-catalog product --merchant-id <id> --product-id <id> [options]

Required Arguments:
  --merchant-id <id>          Merchant-scoped UCP Catalog owner
  --product-id <id>           Product ID returned by ucp-catalog search

Optional Request Fields:
  --context <json>            UCP Catalog context JSON object
  --filters <json>            UCP Catalog filters JSON object; prices use minor units
  --signals <json>            UCP Catalog signals JSON object
  --attribution <json>        UCP Catalog attribution JSON object
  --request-id <id>           Request-Id header; defaults to a generated UUID
  --ucp-agent <value>         UCP-Agent header; defaults to clink-cli

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Behavior:
  Sends POST /agent/ucp/{merchantId}/catalog/product using the environment saved by wallet init.
  OAuth wallets use Bearer authentication with automatic 401 refresh; never-OAuth wallets use
  their legacy customer API key. Request-Id remains stable if an OAuth retry occurs.

Examples:
  clink ucp-catalog product     --merchant-id merchant_xxx     --product-id product_xxx     --context '{"currency":"USD","language":"en-US"}'     --format json
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
  --context <json>            UCP Catalog context JSON object. Fields:
                              - address_country: ISO 3166-1 alpha-2 region hint (e.g., "SG", "HK")
                              - language: IETF BCP 47 language tag (e.g., "en", "zh-Hans")
                              - currency: ISO 4217 code (e.g., "USD", "HKD")
  --filters <json>            UCP Catalog filters JSON object; prices use minor units
  --signals <json>            UCP Catalog signals JSON object
  --attribution <json>        UCP Catalog attribution JSON object
  --request-id <id>           Request-Id header; defaults to a generated UUID
  --ucp-agent <value>         UCP-Agent header; defaults to clink-cli

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  POST /agent/ucp/extra/catalog/search

Behavior:
  Takes no --merchant-id: this endpoint finds which merchants carry the item, so the caller does
  not need to know one up front. Use ucp-catalog search when the merchant is already known.
  address_country is a discovery hint, not a strict filter. Published external-store mappings
  currently cover HK and SG; other ISO codes may leave results un-narrowed.
  Broad discovery returns a bounded, non-exhaustive result window and currently exposes no pagination.
  Use ucp-catalog search for real cursor pagination when a merchant is already known.
  Results come back grouped by target, each group carrying channel_type plus either merchant_id
  (internal merchant) or store_id (external platform store). The shape does not change with
  --channel-type; only the number of groups does.

Examples:
  clink catalog search --query "iced latte" --format json
  clink catalog search \\
    --query shoes --channel-type shopify \\
    --ext '{"trace":"demo-1"}' \\
    --context '{"currency":"USD","language":"en-US"}' \\
    --format pretty
  clink catalog search \\
    --query coffee \\
    --context '{"address_country":"SG","currency":"SGD","language":"en"}' \\
    --format json
`;
var UCP_ORDER_HELP = `clink ucp-order

Usage:
  clink ucp-order <get|list> [options]

Actions:
  get        Get one UCP order's current status by order ID
  list       List the calling wallet's orders, newest first

Examples:
  clink ucp-order get --order-id order_xxx --format json
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
var UCP_CHECKOUT_GET_HELP = `clink ucp-checkout get

Usage:
  clink ucp-checkout get --checkout-id <id> [options]

Required Arguments:
  --checkout-id <id>              Checkout ID to fetch

Optional Arguments:
  --endpoint <url>                Optional checkout endpoint prefix

Options:
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Endpoint:
  GET /agent/ucp/external/checkout-sessions/{checkoutId}

Notes:
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  Once completed, data.order.id is the OMS/UCP order ID accepted by ucp-order get. Do not use an
  agent_order event's resourceId, data.orderId, or data.paymentOrderId; those are Clink Payment
  order IDs, and an order_ prefix does not distinguish the two ID domains.

Examples:
  clink ucp-checkout get --checkout-id chk_xxx --format json
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
  clink instruction create --payment-instrument-id <id> --title <title> --mandates <json> [options]

Required Arguments:
  --payment-instrument-id <id> Payment instrument ID for the Visa card
  --title <title>              Instruction title
  --mandates <json>            Mandate JSON array; amount and currency live on each mandate

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
  Common fields include title, description, amountLimit, currencyCode,
  merchantCategoryCode, and effectiveUntilTime.
  When --is-recurring is set, every mandate must include recurringFrequency (WEEKLY, MONTHLY, or YEARLY).

Notes:
  Creates a CREATED draft instruction and prints a Passkey URL. The instruction becomes ACTIVE only
  after the user completes Passkey/FIDO authorization on the agent page.
  Uses OAuth for OAuth wallets; legacy CSK is limited to wallets that have never used OAuth.
  Do not send clientReferenceId, channelTokenId, or consumerId; the server derives them.

Examples:
  clink instruction create \\
    --payment-instrument-id pi_xxx --title "Business trip" \\
    --effective-until-time "2026-06-25 00:00:00" \\
    --mandates '[{"title":"Hotel","description":"Hotel payment","amountLimit":1000.00,"currencyCode":"USD","merchantCategoryCode":"7011","effectiveUntilTime":"2026-06-25 00:00:00"}]' \\
    --format json
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
  --checkout-id <id>           Match one agent_order event by data.checkoutId/data.checkout_id;
                               preserve every event that is not an exact local match
  --no-ack                     Keep selected events unacknowledged (untyped polls peek the batch)
${CUSTOMER_API_KEY_REQUEST_OPTIONS}

Output (data):
  { "ready": bool, "timedOut": bool, "events": [...], "ackedEventIds": [...] }
  On timeout, "resumeCommand" is included \u2014 rerun it to continue (acked events are
  removed server-side, so no offset is needed).

Notes:
  Every record read is processed: payment_method.* events refresh cached payment methods
  and risk_rule.updated events upsert local risk rule state. With --type, "events" contains
  only matching records; a comma-separated list waits for any listed type. Unrelated records
  are acknowledged and skipped so an older page cannot block the requested type. Matching
  records are also acknowledged by default.
  With both --type and --no-ack, matching records stay queued but unrelated records are still
  acknowledged. Without --type, a poll returns the whole batch and --no-ack acknowledges none.
  --checkout-id requires exactly agent_order.succeeded or agent_order.failed. The request sends
  eventTypes plus selectors.checkoutId to Event Hub before pagination, then checks the payload
  locally. Missing/conflicting checkout aliases fail closed; resourceId/orderId never substitute.
  Only an exact match is ACKed by default, and resumeCommand preserves the selector.

Examples:
  clink events poll --format json
  clink events poll --type payment_method.updated --format json
  clink events poll --type account-created,account-reloaded --format json
  clink events poll --type agent_order.succeeded --checkout-id checkout_123 --format json
  clink events poll --no-ack --format json
`;
function printHelp(command, subcommand, nestedCommand) {
  const output = getHelpText(command, subcommand, nestedCommand);
  process.stdout.write(output);
}
function getHelpText(command, subcommand, nestedCommand) {
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

// public/uat/ucp-merchants.json
var ucp_merchants_default = {
  version: 1,
  updated_at: "2026-08-10T00:00:00Z",
  merchants: [
    {
      domain_name: "modelmax-store-uat.myshopify.com",
      merchant_id: "mcht_fcq09yoqqink",
      enabled: true,
      description: "ModelMax UAT test storefront on Shopify, used to exercise the internal Clink UCP checkout path against a non-production merchant. The storefront is password protected and not open to shoppers, so its catalog is not publicly browsable and its product mix is whatever the team stages for a given test run. Product categories: unspecified test fixtures, typically generic sample products created to validate item parsing, shipping classification, and checkout completion. Treat this entry as integration scaffolding rather than a real commercial catalog, and do not rely on any specific product being present."
    },
    {
      domain_name: "uat-magento.clinkpay.team",
      merchant_id: "mcht_f5d0rys1hjxe",
      enabled: true,
      description: "Magento UAT storefront focused on furniture and home furnishings. Product categories include living-room, bedroom, dining, storage, workspace, kitchen, kids, lighting, bathroom, textile, and related household items. Products are physical goods that generally require shipping, and the catalog is UAT test data used to validate internal Clink UCP catalog discovery, checkout routing, and order completion."
    },
    {
      domain_name: "testa.link2shops.com",
      merchant_id: "mcht_ftmse61a6az0",
      enabled: true,
      description: "Fuhui UAT storefront, a Visa cardholder-benefits coupon and voucher mall covering Hong Kong and selected Asia-Pacific markets. Product categories include dining, retail, travel, entertainment, lifestyle, and shopping offers redeemable as Visa benefits. Listings are coupons and vouchers rather than shipped merchandise, so they are normally digital fulfillment with no shipping required. The catalog is UAT test data used to validate internal Clink UCP catalog discovery, checkout routing, and order completion."
    },
    {
      domain_name: "vtravel.link2shops.com",
      merchant_id: "mcht_ftmse61a6az0",
      enabled: true,
      description: "Fuhui UCP merchant used for Visa benefit redemption in UAT. The vtravel.link2shops.com/yiyuan/#/exitPage URL is an SPA storefront entry rather than a parseable product-detail page, so requests for this domain must use the internal Clink UCP catalog and checkout APIs. The known UAT catalog includes HungryPanda (United States), item ID cf1c321c4d5a4754ad099fa01aa2f9a4. Catalog APIs remain the source of truth for title, price, currency, availability, and the orderable URL."
    }
  ]
};

// public/test/ucp-merchants.json
var ucp_merchants_default2 = {
  version: 1,
  updated_at: "2026-08-14T00:00:00Z",
  merchants: [
    {
      domain_name: "modelmax-store-uat.myshopify.com",
      merchant_id: "mcht_fcq09yoqqink",
      enabled: true,
      description: "ModelMax test storefront on Shopify, reused from the UAT environment to exercise the internal Clink UCP checkout path against a non-production merchant. The storefront is password protected and not open to shoppers, so its catalog is not publicly browsable and its product mix is whatever the team stages for a given test run. Product categories: unspecified test fixtures, typically generic sample products created to validate item parsing, shipping classification, and checkout completion. Treat this entry as integration scaffolding rather than a real commercial catalog, and do not rely on any specific product being present."
    },
    {
      domain_name: "testa.link2shops.com",
      merchant_id: "mcht_f5xuyduv1a0j",
      enabled: true,
      description: "Fuhui test storefront, a Visa cardholder-benefits coupon and voucher mall covering Hong Kong and selected Asia-Pacific markets. Product categories include dining, retail, travel, entertainment, lifestyle, and shopping offers redeemable as Visa benefits. Listings are coupons and vouchers rather than shipped merchandise, so they are normally digital fulfillment with no shipping required. The catalog is test data used to validate internal Clink UCP catalog discovery, checkout routing, and order completion."
    }
  ]
};

// dist/internal-ucp.js
var MERCHANT_LIST_USER_AGENT = "clink-cli";
var MERCHANT_LIST_TIMEOUT_MS = 15e3;
var BUNDLED_MERCHANT_LISTS = {
  sandbox: ucp_merchants_default,
  test: ucp_merchants_default2
};
function validateInternalUcpMerchants(value, source) {
  const records = merchantRecordsOf(value, source);
  const merchants = /* @__PURE__ */ new Map();
  const seenDomains = /* @__PURE__ */ new Set();
  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw validationError(`invalid internal UCP merchant at ${source}[${index}]`);
    }
    const fields = record;
    const domainName = canonicalDomain(fields.domain_name);
    const merchantId = stringValue(fields.merchant_id);
    if (!domainName || !merchantId) {
      throw validationError(`invalid internal UCP merchant at ${source}[${index}]`);
    }
    if (fields.enabled !== void 0 && typeof fields.enabled !== "boolean") {
      throw validationError(`invalid internal UCP merchant at ${source}[${index}]`);
    }
    if (seenDomains.has(domainName)) {
      throw validationError(`duplicate internal UCP domain: ${domainName}`);
    }
    seenDomains.add(domainName);
    if (fields.enabled !== false) {
      merchants.set(domainName, merchantId);
    }
  });
  return merchants;
}
function merchantRecordsOf(value, source) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    const envelope = value;
    if (Array.isArray(envelope.merchants)) {
      return envelope.merchants;
    }
  }
  throw validationError(`invalid internal UCP config: ${source}`);
}
async function getInternalUcpMerchantList(options2 = {}) {
  const environment = options2.environment ?? "production";
  const loaded = await loadInternalUcpMerchantListDocument(environment, options2);
  validateInternalUcpMerchants(loaded.document, loaded.source);
  const merchants = merchantRecordsOf(loaded.document, loaded.source);
  if (Array.isArray(loaded.document)) {
    return { merchants: [...merchants] };
  }
  return {
    ...loaded.document,
    merchants: [...merchants]
  };
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
  const merchants = options2.merchants ?? await loadInternalUcpMerchants(environment, options2);
  const merchantId = merchants.get(domainName);
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
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw validationError("invalid internal UCP base URL");
  }
  return {
    domainName,
    merchantId,
    provider: "clinkbill",
    endpoint: endpoint.toString()
  };
}
async function loadInternalUcpMerchants(environment, options2) {
  const loaded = await loadInternalUcpMerchantListDocument(environment, options2);
  return validateInternalUcpMerchants(loaded.document, loaded.source);
}
async function loadInternalUcpMerchantListDocument(environment, options2) {
  const explicitUrl = options2.merchantListUrl?.trim() || process.env.CLINK_UCP_MERCHANTS_URL?.trim() || void 0;
  if (!explicitUrl) {
    const bundled = BUNDLED_MERCHANT_LISTS[environment];
    if (bundled !== void 0) {
      return {
        document: bundled,
        source: `public/${bundledListName(environment)}/ucp-merchants.json`
      };
    }
  }
  const listUrl = explicitUrl ?? MERCHANT_LIST_URLS[environment];
  if (!listUrl) {
    throw configError(`no internal UCP merchant list for the ${environment} environment; set CLINK_UCP_MERCHANTS_URL`);
  }
  const fetchList = options2.fetchMerchantList ?? ((url) => fetchMerchantListDocument(url, options2.timeoutMs));
  return {
    document: await fetchList(listUrl),
    source: listUrl
  };
}
function bundledListName(environment) {
  return environment === "sandbox" ? "uat" : environment;
}
async function fetchMerchantListDocument(url, timeoutMs = MERCHANT_LIST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US",
        "User-Agent": MERCHANT_LIST_USER_AGENT
      },
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw networkError(`internal UCP merchant list request timed out after ${timeoutMs}ms`);
    }
    throw networkError(`internal UCP merchant list request failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw networkError(`internal UCP merchant list request failed with status ${response.status}`);
  }
  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch {
    throw networkError(`internal UCP merchant list is not valid JSON: ${url}`);
  }
}
function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function canonicalDomain(value) {
  return stringValue(value)?.toLowerCase().replace(/\.+$/, "");
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
  const pendingInstructionId = optionalString(data.pending_instruction_id);
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
  if (!options2.explicitFormat) {
    process.stderr.write(renderHumanError(cliError, options2.helpHint));
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
function renderHumanError(error, helpHint) {
  const lines = [`Error: ${error.message}`];
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
  if (!isRecord3(data)) {
    throw apiError(invalidMessage, 502);
  }
  return data;
}
function normalizePaymentMethods(value) {
  if (!Array.isArray(value)) {
    throw apiError("invalid card binding response: missing or invalid paymentMethodsVoList", 502);
  }
  if (!value.every((item) => isRecord3(item) && typeof item.paymentInstrumentId === "string" && item.paymentInstrumentId.trim().length > 0)) {
    throw apiError("invalid card binding response: missing or invalid paymentMethodsVoList", 502);
  }
  return value.map((item) => ({ ...item }));
}
function optionalString2(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function isRecord3(value) {
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
  const channel = isRecord4(data.channelPaymentResponse) ? data.channelPaymentResponse : {};
  const action = isRecord4(channel.action) ? channel.action : {};
  const redirectUrl = typeof action.redirectUrl === "string" && action.redirectUrl.length > 0 ? action.redirectUrl : void 0;
  const status = finiteNumber2(channel.status);
  return {
    status,
    requires3ds: Number(channel.flag3DS ?? 0) === 1 && redirectUrl !== void 0,
    ...redirectUrl ? { redirectUrl } : {}
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
function isRecord4(value) {
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
function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== void 0));
}

// dist/skills/install.js
import { randomUUID as createRandomUUID } from "node:crypto";
import { mkdir as mkdir5, rm as rm6 } from "node:fs/promises";
import { join as join4 } from "node:path";

// dist/skills/agents.js
import { constants } from "node:fs";
import { cp, copyFile, lstat, mkdir as mkdir2, open as open2, readdir, readlink, realpath, rename as rename2, rm as rm2, rmdir, symlink } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
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
  const sharedTarget = join(skillsRoot, input.skillName);
  const detected = [];
  try {
    await appendDetected(detected, "cursor", "link", join(homeDir, ".cursor"), (rootPath) => join(rootPath, "skills", input.skillName));
    await appendDetected(detected, "claude-code", "link", join(homeDir, ".claude"), (rootPath) => join(rootPath, "skills", input.skillName));
    const codexRoot = resolveEnvironmentRoot(input.env.CODEX_HOME, join(homeDir, ".codex"));
    await appendDetected(detected, "codex", "link", codexRoot, (rootPath) => join(rootPath, "skills", input.skillName));
    await appendDetected(detected, "codebuddy", "link", join(homeDir, ".codebuddy"), (rootPath) => join(rootPath, "skills", input.skillName));
    await appendDetected(detected, "openclaw", "shared", join(homeDir, ".openclaw"), () => sharedTarget);
    const hermesRoot = resolveEnvironmentRoot(input.env.HERMES_HOME, join(homeDir, ".hermes"));
    await appendDetected(detected, "hermes", "copy", hermesRoot, (rootPath) => join(rootPath, "skills", input.skillName));
    await appendDetected(detected, "trae", "link", join(homeDir, ".trae"), (rootPath) => join(rootPath, "skills", input.skillName));
    const opencodeRoot = await firstExistingRoot(uniquePaths([
      resolveOptionalEnvironmentRoot(input.env.OPENCODE_CONFIG_DIR),
      join(resolveEnvironmentRoot(input.env.XDG_CONFIG_HOME, join(homeDir, ".config")), "opencode"),
      join(homeDir, ".opencode")
    ]));
    if (opencodeRoot !== null) {
      detected.push({
        agent: "opencode",
        mode: "shared",
        rootPath: opencodeRoot,
        targetPath: sharedTarget
      });
    }
    const copilotCliRoot = resolveEnvironmentRoot(input.env.COPILOT_HOME, join(homeDir, ".copilot"));
    const copilotRoot = await firstExistingRoot(uniquePaths([
      copilotCliRoot,
      join(homeDir, ".config", "github-copilot")
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
    const geminiRoot = join(geminiHome, ".gemini");
    if (await isExistingRoot(geminiRoot)) {
      const usesSharedHome = geminiHome === homeDir;
      detected.push({
        agent: "gemini-cli",
        mode: usesSharedHome ? "shared" : "link",
        rootPath: geminiRoot,
        targetPath: usesSharedHome ? sharedTarget : join(geminiRoot, "skills", input.skillName)
      });
    }
    await appendDetected(detected, "codework", "unsupported", join(homeDir, ".codework"), () => null);
    await appendDetected(detected, "chatgpt", "unsupported", join(homeDir, ".chatgpt"), () => null);
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
      const backupPath = needsBackup ? join(input.backupsRoot, `${input.uuid}-${detected.agent}`) : null;
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
  const backupObjectPath = backupPath === null ? null : join(backupPath, "target");
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
        await rm2(targetPath, { recursive: true, force: true });
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
            await rm2(backupPath, { recursive: true, force: true });
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
    await cp(join(sourcePath, entry.name), join(targetPath, entry.name), {
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
    await rm2(backupPath, { force: true });
    return;
  }
  if (backupFingerprint.type === "file") {
    await copyFile(backupPath, targetPath, constants.COPYFILE_EXCL);
    await rm2(backupPath, { force: true });
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
      await rm2(backupPath, { recursive: true });
      return;
    } catch (error) {
      const currentTarget = await lstatIfExists(targetPath);
      if (currentTarget !== null && sameEntryIdentity(createEntryIdentity(currentTarget), placedDirectory)) {
        await rm2(targetPath, { recursive: true, force: true });
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
    const releasesRoot = await realpath(join(dirname(currentPath), ".clink", "releases"));
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
  await rm2(filePath, { recursive: true, force: true });
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
  const markerPath = join(rootPath, MARKER_FILE_NAME);
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
import { chmod as chmod2, lstat as lstat2, mkdir as mkdir3, open as open3, readdir as readdir2, rm as rm3, writeFile as writeFile2 } from "node:fs/promises";
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
      await rm3(destinationRoot, { recursive: true, force: true });
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
  await chmod2(destinationRoot, 493);
  const rawRoot = resolve2(destinationRoot, "raw");
  assertPathContained(destinationRoot, rawRoot);
  await mkdir3(rawRoot, { mode: 493 });
  await chmod2(rawRoot, 493);
  const skillPath = resolve2(rawRoot, "SKILL.md");
  assertPathContained(rawRoot, skillPath);
  await writeFile2(skillPath, bytes, { flag: "wx", mode: 420 });
  await chmod2(skillPath, 420);
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
    await chmod2(destinationRoot, 493);
    const rawRoot = resolve2(destinationRoot, "raw");
    assertPathContained(destinationRoot, rawRoot);
    await mkdir3(rawRoot, { mode: 493 });
    await chmod2(rawRoot, 493);
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
      await chmod2(outputPath, mode);
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
      await rm3(destinationRoot, { recursive: true, force: true });
    } catch {
    }
    throw installError(INSTALL_ERROR_MESSAGE);
  }
}
var ArchivePathRegistry = class {
  #paths = /* @__PURE__ */ new Map();
  register(path3, kind) {
    const segments = path3.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      this.#registerDirectory(segments.slice(0, index).join("/"), false);
    }
    if (kind === "directory") {
      this.#registerDirectory(path3, true);
      return;
    }
    const key = canonicalArchivePath(path3);
    const existing = this.#paths.get(key);
    if (existing !== void 0) {
      throw new Error("archive path collision");
    }
    this.#paths.set(key, { kind: "file", path: path3, explicit: true });
  }
  #registerDirectory(path3, explicit) {
    const key = canonicalArchivePath(path3);
    const existing = this.#paths.get(key);
    if (existing === void 0) {
      this.#paths.set(key, { kind: "directory", path: path3, explicit });
      return;
    }
    if (existing.kind !== "directory" || existing.path !== path3) {
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
function rejectInstallMarker(path3) {
  if (path3.split("/").some((segment) => segment.normalize("NFC").toLowerCase() === INSTALL_MARKER_NAME)) {
    throw new Error("archive contains a reserved install marker");
  }
}
function canonicalArchivePath(path3) {
  return path3.normalize("NFC").toLowerCase();
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
    await chmod2(current, 493);
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
import { lstat as lstat3, rm as rm4 } from "node:fs/promises";
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
    await rm4(destinationPath, { force: true });
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
        "Content-Type": "application/json"
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
import path2 from "node:path";

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
          Clientid: CLINK_PUBLIC_CLIENT_ID
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
    return isRecord5(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function hasNonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function selectPublicSkillItems(body) {
  const payload = selectPublicSkillPayload(body);
  if (!payload || !Array.isArray(payload.items) || !payload.items.every(isRecord5)) {
    return void 0;
  }
  return payload.items;
}
function selectPublicSkillPayload(body) {
  if (isRecord5(body) && Array.isArray(body.items)) {
    return body;
  }
  const unwrapped = unwrapApiData(body);
  if (isRecord5(unwrapped) && Array.isArray(unwrapped.items)) {
    return unwrapped;
  }
  return void 0;
}
function isRecord5(value) {
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
  return typeof value === "string" && value.length > 0 && value.length <= 255 && value !== "." && value !== ".." && path2.posix.basename(value) === value && path2.win32.basename(value) === value && !/[\u0000-\u001f\u007f]/.test(value);
}

// dist/skills/store.js
import { join as join3 } from "node:path";

// dist/skills/store-publication.js
import { randomUUID as randomUUID3 } from "node:crypto";
import { constants as constants2 } from "node:fs";
import { chmod as chmod3, cp as cp2, copyFile as copyFile2, link, lstat as lstat4, mkdir as mkdir4, open as open4, readdir as readdir3, readlink as readlink2, realpath as realpath2, rename as rename3, rm as rm5, symlink as symlink2, utimes } from "node:fs/promises";
import { basename, dirname as dirname3, isAbsolute as isAbsolute3, join as join2, relative as relative3, resolve as resolve3, sep as sep2 } from "node:path";
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
    const marker = await readNoFollowInstallMarker(join2(canonicalReleasePath, INSTALL_MARKER_NAME2));
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
  const existingMarker = await readNoFollowInstallMarker(join2(releasePath, INSTALL_MARKER_NAME2));
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
  const installedMarker = await readNoFollowInstallMarker(join2(paths.releasePath, INSTALL_MARKER_NAME2));
  if (installedMarker === null || !sameInstallMarker(installedMarker, marker)) {
    throw new Error("release marker changed during publication");
  }
  return { fingerprint: releaseFingerprint, marker };
}
async function ensureReleaseParent(paths, marker) {
  await ensureRealDirectory(paths.releasesRoot);
  const publisherPath = join2(paths.releasesRoot, marker.publisher);
  await ensureRealDirectory(publisherPath);
  await ensureRealDirectory(join2(publisherPath, marker.skillName));
}
async function ensureRealDirectory(path3) {
  await mkdir4(path3, { recursive: true, mode: 448 });
  const pathStat = await lstat4(path3);
  if (!pathStat.isDirectory() || pathStat.isSymbolicLink()) {
    throw new Error("store path is not a real directory");
  }
}
async function writeInstallMarker(rootPath, marker) {
  const markerPath = join2(rootPath, INSTALL_MARKER_NAME2);
  const handle = await open4(markerPath, constants2.O_WRONLY | constants2.O_CREAT | constants2.O_EXCL | constants2.O_NOFOLLOW, 420);
  try {
    await handle.writeFile(JSON.stringify(marker), "utf8");
    await handle.chmod(420);
  } finally {
    await handle.close();
  }
}
async function readNoFollowInstallMarker(path3) {
  const parsed = await readNoFollowJson(path3);
  return isInstallMarker(parsed) ? parsed : null;
}
async function readNoFollowJson(path3) {
  let handle;
  try {
    handle = await open4(path3, constants2.O_RDONLY | constants2.O_NOFOLLOW);
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
  const containerPath = join2(paths.backupsRoot, backupName);
  await mkdir4(containerPath, { mode: 448 });
  const containerFingerprint = await fingerprintPath2(containerPath);
  if (containerFingerprint.kind !== "directory") {
    throw new Error("backup container is not a directory");
  }
  const entryPath = join2(containerPath, basename(paths.currentPath));
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
      await rm5(containerPath, { recursive: true });
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
  const containerPath = join2(backupsRoot, cleanupName);
  await mkdir4(containerPath, { mode: 448 });
  const containerFingerprint = await fingerprintPath2(containerPath);
  const entryPath = join2(containerPath, basename(currentPath));
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
        await chmod3(currentPath, backup.entryFingerprint.mode & 4095);
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
    await cp2(join2(sourcePath, entry), join2(destinationPath, entry), {
      recursive: true,
      errorOnExist: true,
      force: false,
      preserveTimestamps: true,
      verbatimSymlinks: true
    });
  }
  await chmod3(destinationPath, mode & 4095);
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
  const movedEntry = await fingerprintPath2(join2(cleanupPath, basename(backup.entryPath)));
  if (!samePathFingerprint(movedContainer, backup.containerFingerprint) || !samePathFingerprint(movedEntry, backup.entryFingerprint)) {
    try {
      await rename3(cleanupPath, backup.containerPath);
    } catch {
    }
    throw new Error("backup changed during removal");
  }
  await rm5(cleanupPath, { recursive: true });
}
async function removeCreatedRelease(releasePath, releasesRoot, created, uuid) {
  const current = await fingerprintPath2(releasePath);
  const marker = await readNoFollowInstallMarker(join2(releasePath, INSTALL_MARKER_NAME2));
  await canonicalExistingReleasePath(releasePath, releasesRoot);
  if (!samePathFingerprint(current, created.fingerprint) || marker === null || !sameInstallMarker(marker, created.marker)) {
    throw new Error("created release changed before rollback");
  }
  const cleanupPath = `${releasePath}.rollback-${uuid}`;
  await rename3(releasePath, cleanupPath);
  const moved = await fingerprintPath2(cleanupPath);
  const movedMarker = await readNoFollowInstallMarker(join2(cleanupPath, INSTALL_MARKER_NAME2));
  if (!samePathFingerprint(moved, created.fingerprint) || movedMarker === null || !sameInstallMarker(movedMarker, created.marker)) {
    try {
      await rename3(cleanupPath, releasePath);
    } catch {
    }
    throw new Error("created release changed during rollback");
  }
  await rm5(cleanupPath, { recursive: true });
}
async function fingerprintPath2(path3) {
  const before = await lstat4(path3);
  const kind = pathKind(before);
  const linkTarget = kind === "symlink" ? await readlink2(path3) : null;
  const after = await lstat4(path3);
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
async function assertPathFingerprint(path3, expected) {
  const current = await fingerprintPath2(path3);
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
  const skillsRoot = join3(homeDir, ".agents", "skills");
  const clinkRoot = join3(skillsRoot, ".clink");
  const releasesRoot = join3(clinkRoot, "releases");
  return {
    skillsRoot,
    clinkRoot,
    stagingPath: join3(clinkRoot, "staging", uuid),
    releasesRoot,
    releasePath: join3(releasesRoot, spec.publisher, spec.skillName, sha256),
    backupsRoot: join3(clinkRoot, "backups"),
    currentPath: join3(skillsRoot, spec.skillName)
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
  remove: async (path3) => rm6(path3, { recursive: true, force: true }),
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
  const skillsRoot = join4(input.homeDir, ".agents", "skills");
  const installPath = join4(skillsRoot, input.skillName);
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
      destinationPath: join4(preliminaryPaths.stagingPath, "package"),
      timeoutMs: downloadTimeoutMs,
      refreshTicket: () => dependencies.getTicket({
        baseUrl: input.dashboardBaseUrl,
        packageSpec,
        timeoutMs: input.timeoutMs
      })
    });
    dependencies.log("Materializing skill package");
    const extracted = await dependencies.materializePackage(downloaded.path, join4(preliminaryPaths.stagingPath, "extract"));
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
  const skillsRoot = join4(input.homeDir, ".agents", "skills");
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
  const paySuccessInfo = isRecord6(data.paySuccessInfo) ? data.paySuccessInfo : {};
  const orderId = stringValue2(paySuccessInfo.orderId).trim();
  return orderId || void 0;
}
function channelPaymentMessage(data) {
  const channel = isRecord6(data.channelPaymentResponse) ? data.channelPaymentResponse : {};
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
function isRecord6(value) {
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
  if (!isRecord7(profile)) {
    return [];
  }
  const ucp = isRecord7(profile.ucp) ? profile.ucp : profile;
  const paymentHandlers = isRecord7(ucp.payment_handlers) ? ucp.payment_handlers : isRecord7(ucp.paymentHandlers) ? ucp.paymentHandlers : void 0;
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
      if (!isRecord7(handler) || !isRecord7(handler.config)) {
        continue;
      }
      const merchantInfo = isRecord7(handler.config.merchant_info) ? handler.config.merchant_info : isRecord7(handler.config.merchantInfo) ? handler.config.merchantInfo : void 0;
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
  let path3 = defaultCookiePath(url.pathname);
  for (const attribute of attributes) {
    const attributeSeparator = attribute.indexOf("=");
    const attributeName = (attributeSeparator >= 0 ? attribute.slice(0, attributeSeparator) : attribute).toLowerCase();
    const attributeValue = attributeSeparator >= 0 ? attribute.slice(attributeSeparator + 1) : "";
    if (attributeName === "domain" && attributeValue) {
      domain = attributeValue.trim().toLowerCase().replace(/^\./, "");
      hostOnly = false;
    } else if (attributeName === "path" && attributeValue.startsWith("/")) {
      path3 = attributeValue;
    }
  }
  return {
    name,
    value,
    domain,
    hostOnly,
    path: path3
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
  if (!isRecord7(value)) {
    return;
  }
  const result = readPath(value, ["session", "negotiate", "result"]);
  if (isRecord7(result)) {
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
  if (!isRecord7(runningTotal)) {
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
  if (!isRecord7(productJson)) {
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
  if (!isRecord7(variant)) {
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
    if (!isRecord7(option)) {
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
  if (!isRecord7(value)) {
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
function readPath(value, path3) {
  let current = value;
  for (const key of path3) {
    if (!isRecord7(current)) {
      return void 0;
    }
    current = current[key];
  }
  return current;
}
function isRecord7(value) {
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
var RECURRING_FREQUENCIES = ["WEEKLY", "MONTHLY", "YEARLY"];
var RECURRING_FREQUENCY_SET = new Set(RECURRING_FREQUENCIES);
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
var DEFAULT_UCP_AGENT = "clink-cli";
var OAUTH_OPERATION_VALIDITY_BUFFER_MS = 3e4;
var BASE_COMMAND_NAMES = /* @__PURE__ */ new Set([
  "wallet",
  "card",
  "risk",
  "skills",
  "pay",
  "refund",
  "ucp-checkout",
  "ucp-catalog",
  "catalog",
  "ucp-order",
  "instruction",
  "events",
  "tool",
  "config"
]);
async function runCli(argv, startedAt = performance.timeOrigin + performance.now(), edition = {}) {
  const args = parseArgs(argv, edition.parseArgsOptions);
  const [command, subcommand, nestedCommand] = args.positionals;
  edition.validateArgs?.(command, subcommand, args.flags);
  validateEnvironmentFlagScope(command, subcommand, args.flags, edition.environmentSelectingInitCommands ?? []);
  validateEventPollSelector(command, subcommand, args.flags);
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
  const storedConfig = await readStoredConfig();
  const runtimeConfig = resolveRuntimeConfig(storedConfig, args.flags);
  const globalOptions = resolveGlobalOptions(args, storedConfig);
  const context = {
    args,
    storedConfig,
    runtimeConfig,
    authorizationIdentity: runtimeAuthorizationIdentity(runtimeConfig),
    globalOptions,
    startedAt,
    oauthScope: edition.oauthScope ?? OAUTH_DEFAULT_SCOPE,
    configLifecycle: edition.configLifecycle ?? {}
  };
  await prepareOAuthAuthorization(command, subcommand, context);
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
function validateEventPollSelector(command, subcommand, flags) {
  if (command !== "events" || subcommand !== "poll" || !("checkout-id" in flags)) {
    return;
  }
  const checkoutId = getStringFlag(flags, "checkout-id")?.trim();
  if (!checkoutId) {
    throw validationError("invalid --checkout-id: expected a non-blank id");
  }
  const type = parseEventTypeFlag(getStringFlag(flags, "type"));
  if (type !== "agent_order.succeeded" && type !== "agent_order.failed") {
    throw validationError("--checkout-id requires --type agent_order.succeeded or --type agent_order.failed");
  }
}
function validateEnvironmentFlagScope(command, subcommand, flags, editionCommands) {
  const environmentCommands = ["wallet", ...editionCommands];
  const isEnvironmentSelectingInit = command !== void 0 && environmentCommands.includes(command) && subcommand === "init";
  if (isEnvironmentSelectingInit) {
    resolveSelectedEnvironment(flags);
  }
  const supportedBy = environmentCommands.map((name) => `${name} init`).join(" or ");
  if (!isEnvironmentSelectingInit && getBooleanFlag(flags, "sandbox")) {
    throw validationError(`--sandbox is only supported by ${supportedBy}`);
  }
  if (!isEnvironmentSelectingInit && getBooleanFlag(flags, "test")) {
    throw validationError(`--test is only supported by ${supportedBy}`);
  }
}
async function handleSkillsCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("skills");
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
async function prepareOAuthAuthorization(command, subcommand, context) {
  if (context.globalOptions.dryRun || !context.storedConfig.authorization || !commandUsesCustomerAuthorization(command, subcommand)) {
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
function commandUsesCustomerAuthorization(command, subcommand) {
  switch (command) {
    case "card":
      return subcommand === "binding-link" || subcommand === "setup-link" || subcommand === "modify-link";
    case "risk":
      return subcommand === "get" || subcommand === "link";
    case "skills":
      return subcommand === "tip";
    case "pay":
      return true;
    case "refund":
    case "ucp-checkout":
    case "ucp-catalog":
    case "catalog":
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
    printHelp("tool");
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
    printHelp("tool", "internal-ucp");
    return EXIT_CODES.OK;
  }
  const baseUrl = context.runtimeConfig.baseUrl;
  const configuredEnvironment = clinkEnvironmentForApiBaseUrl(baseUrl);
  switch (nestedCommand) {
    case "get-merchant-list": {
      const hasMerchantListOverride = Boolean(process.env.CLINK_UCP_MERCHANTS_URL?.trim());
      if (!configuredEnvironment && !hasMerchantListOverride) {
        throw configError("configured base URL does not match production, sandbox, or test; run wallet init to select an environment");
      }
      const result = await getInternalUcpMerchantList({
        environment: configuredEnvironment ?? "production",
        timeoutMs: context.globalOptions.timeoutMs
      });
      printJson(result, context.globalOptions.format);
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
      printPendingWatchHandoff(url, watchTarget.eventType);
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
function printPendingWatchHandoff(url, eventType) {
  if (!url || !eventType) {
    return;
  }
  process.stderr.write(`Watch not started (--no-watch). This link needs a listener before the user acts on it.
Run now: clink-cli events poll --type ${eventType} --no-ack --format json
`);
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
  const type = parseEventTypeFlag(getStringFlag(flags, "type"));
  const checkoutId = getStringFlag(flags, "checkout-id")?.trim();
  const ack = !getBooleanFlag(flags, "no-ack");
  if ("checkout-id" in flags && !checkoutId) {
    throw validationError("invalid --checkout-id: expected a non-blank id");
  }
  if (checkoutId && type !== "agent_order.succeeded" && type !== "agent_order.failed") {
    throw validationError("--checkout-id requires --type agent_order.succeeded or --type agent_order.failed");
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
  const result = await collectWebhookEvents({
    runtimeConfig: context.runtimeConfig,
    getRuntimeConfig,
    resolveStoredRuntimeConfig: (storedConfig) => resolveRuntimeConfig(storedConfig, context.args.flags),
    refreshRuntimeConfig,
    timeoutMs: context.globalOptions.timeoutMs,
    ack,
    maxDurationMs,
    ...pageSize !== void 0 ? { pageSize } : {},
    ...type ? { type } : {},
    ...checkoutId ? { checkoutId } : {}
  });
  printSuccess({
    ready: result.ready,
    timedOut: result.timedOut,
    events: result.events,
    ackedEventIds: result.ackedEventIds,
    ...result.timedOut ? {
      resumeCommand: buildResumeCommand(type, checkoutId, ack, context.globalOptions.format, process.env.CLINK_BASE_URL)
    } : {}
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
function buildResumeCommand(type, checkoutId, ack, format, baseUrlOverride) {
  const parts = ["clink events poll"];
  if (type) {
    parts.push(`--type ${quoteShellArgument(type)}`);
  }
  if (checkoutId) {
    parts.push(`--checkout-id ${quoteShellArgument(checkoutId)}`);
  }
  if (!ack) {
    parts.push("--no-ack");
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
async function handleWalletCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("wallet");
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
  const instructionContext = instructionContextBody(context);
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
        wouldRemoveCustomerApiKey: Boolean(context.storedConfig.customerApiKey)
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
  await updateStoredConfig((current) => {
    const currentIdentity = runtimeAuthorizationIdentity(resolveRuntimeConfig(current, context.args.flags));
    const legacyOAuthChanged = Boolean(authorization && !authorization.sessionId && current.authorization && current.authorization.accessToken !== authorization.accessToken);
    if (currentIdentity.type !== "none" && (currentIdentity.type !== logoutIdentity.type || !authorizationIdentityCanContinue(logoutIdentity, currentIdentity) || legacyOAuthChanged)) {
      throw authError("Authentication changed while logout was in progress; the newer login was preserved.");
    }
    delete current.authorization;
    delete current.customerApiKey;
    return context.configLifecycle.afterWalletLogout?.(current) ?? current;
  });
  printSuccess({
    loggedOut: true,
    serverRevocation,
    authorizationRemoved: Boolean(authorization),
    customerApiKeyRemoved: hadCustomerApiKey,
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
    printHelp("card");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "binding-link":
      return cardBindingLink(context);
    case "setup-link":
      return cardRedirectLink(context, CARD_SETUP_PATH, "card setup");
    case "modify-link":
      return cardRedirectLink(context, CARD_MANAGEMENT_PATH, "card management");
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
  const authorization = instructionId || mandateId || legacyPurchaseInstructionId ? {
    ...instructionId ? { instructionId } : {},
    ...mandateId ? { mandateId } : {},
    ...legacyPurchaseInstructionId ? { legacyInstructionId: legacyPurchaseInstructionId } : {}
  } : void 0;
  const chargeInput = sessionId ? {
    mode: "session",
    paymentInstrumentId,
    paymentMethodType,
    sessionId,
    ...authorization ? { authorization } : {},
    ...shippingAddress ? { shippingAddress } : {},
    ...products ? { products } : {}
  } : {
    mode: "direct",
    paymentInstrumentId,
    paymentMethodType,
    merchantId,
    amount: parseAmount(requireStringFlag(flags, "missing --amount", "amount")),
    currency: requireStringFlag(flags, "missing --currency", "currency"),
    ...authorization ? { authorization } : {},
    ...shippingAddress ? { shippingAddress } : {},
    ...products ? { products } : {}
  };
  const paymentMethodApi = createPaymentMethodApi(context);
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
  const staleEventCutoffMs = Date.now();
  printSuccess(addPaymentMethodsRefreshWarning(execution.data, execution.paymentMethodsRefreshWarning), context.globalOptions.format);
  if (execution.requires3ds && execution.redirectUrl) {
    await maybeWatchEvents(context, execution.redirectUrl, "3-D Secure authentication", {
      staleEventCutoffMs
    });
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
async function handleUcpCatalogCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("ucp-catalog");
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
  rejectUcpCatalogFlags(flags, "search", ["product-id"]);
  const merchantId = requireNonBlankFlag(flags, "merchant-id", "missing --merchant-id");
  const query = requireNonBlankFlag(flags, "query", "missing --query");
  const limit = parseIntFlag(getStringFlag(flags, "limit"), "--limit must be an integer between 1 and 100", 1);
  if (limit !== void 0 && limit > 100) {
    throw validationError("--limit must be an integer between 1 and 100");
  }
  const cursor = getStringFlag(flags, "cursor")?.trim() || void 0;
  const pagination = compact3({ cursor, limit });
  const body = compact3({
    query,
    context: optionalJsonObjectFlag(flags, "context"),
    signals: optionalJsonObjectFlag(flags, "signals"),
    attribution: optionalJsonObjectFlag(flags, "attribution"),
    filters: optionalJsonObjectFlag(flags, "filters"),
    pagination: Object.keys(pagination).length > 0 ? pagination : void 0
  });
  const requestId = getStringFlag(flags, "request-id")?.trim() || randomUUID4();
  const ucpAgent = getStringFlag(flags, "ucp-agent")?.trim() || DEFAULT_UCP_AGENT;
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: `/agent/ucp/${encodeURIComponent(merchantId)}/catalog/search`,
    headers: {
      ...buildCustomerApiKeyHeaders(runtimeConfig),
      "Request-Id": requestId,
      "UCP-Agent": ucpAgent
    },
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function ucpCatalogProduct(context) {
  const flags = context.args.flags;
  rejectUcpCatalogFlags(flags, "product", ["query", "cursor", "limit"]);
  const merchantId = requireNonBlankFlag(flags, "merchant-id", "missing --merchant-id");
  const productId = requireNonBlankFlag(flags, "product-id", "missing --product-id");
  const body = compact3({
    id: productId,
    context: optionalJsonObjectFlag(flags, "context"),
    signals: optionalJsonObjectFlag(flags, "signals"),
    attribution: optionalJsonObjectFlag(flags, "attribution"),
    filters: optionalJsonObjectFlag(flags, "filters")
  });
  const requestId = getStringFlag(flags, "request-id")?.trim() || randomUUID4();
  const ucpAgent = getStringFlag(flags, "ucp-agent")?.trim() || DEFAULT_UCP_AGENT;
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: `/agent/ucp/${encodeURIComponent(merchantId)}/catalog/product`,
    headers: {
      ...buildCustomerApiKeyHeaders(runtimeConfig),
      "Request-Id": requestId,
      "UCP-Agent": ucpAgent
    },
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
function rejectUcpCatalogFlags(flags, subcommand, unsupportedFlags) {
  const unsupported = unsupportedFlags.find((name) => name in flags);
  if (unsupported) {
    throw validationError(`--${unsupported} is not supported by ucp-catalog ${subcommand}`);
  }
}
async function handleCatalogCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("catalog");
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
  if ("merchant-id" in flags) {
    throw validationError("--merchant-id is not supported by catalog search; use ucp-catalog search");
  }
  const unsupportedPaginationFlag = ["limit", "cursor"].find((name) => name in flags);
  if (unsupportedPaginationFlag) {
    throw validationError(`--${unsupportedPaginationFlag} is not supported by catalog search; broad discovery currently has no pagination`);
  }
  const query = requireNonBlankFlag(flags, "query", "missing --query");
  const body = compact3({
    query,
    context: optionalJsonObjectFlag(flags, "context"),
    signals: optionalJsonObjectFlag(flags, "signals"),
    attribution: optionalJsonObjectFlag(flags, "attribution"),
    filters: optionalJsonObjectFlag(flags, "filters"),
    channel_type: getStringFlag(flags, "channel-type")?.trim() || void 0,
    form_type: getStringFlag(flags, "form-type")?.trim() || void 0,
    ext: optionalJsonObjectFlag(flags, "ext")
  });
  const requestId = getStringFlag(flags, "request-id")?.trim() || randomUUID4();
  const ucpAgent = getStringFlag(flags, "ucp-agent")?.trim() || DEFAULT_UCP_AGENT;
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "POST",
    path: EXTRA_CATALOG_SEARCH_PATH,
    headers: {
      ...buildCustomerApiKeyHeaders(runtimeConfig),
      "Request-Id": requestId,
      "UCP-Agent": ucpAgent
    },
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function handleUcpOrderCommand(subcommand, context) {
  if (!subcommand) {
    printHelp("ucp-order");
    return EXIT_CODES.OK;
  }
  switch (subcommand) {
    case "get":
      return ucpOrderGet(context);
    case "list":
      return ucpOrderList(context);
    default:
      throw validationError(`unsupported ucp-order command: ${subcommand}`);
  }
}
async function ucpOrderGet(context) {
  const orderId = requireNonBlankFlag(context.args.flags, "order-id", "missing --order-id");
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    baseUrl: runtimeConfig.baseUrl,
    method: "GET",
    path: `${UCP_ORDER_PATH}/${encodeURIComponent(orderId)}`,
    headers: buildCustomerApiKeyHeaders(runtimeConfig),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
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
async function ucpCheckoutCreate(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
  const currency = requireStringFlag(flags, "missing --currency", "currency");
  const customerId = asRequiredString(context.storedConfig.customerId, "missing customerId; run `clink wallet init` or run `clink config set customer-id <customerId>`");
  const email = asRequiredString(context.storedConfig.email, "missing email; run `clink wallet init` or run `clink config set email <email>`");
  const buyer = withWalletStatusEmail(optionalJsonObjectFlag(flags, "buyer"), email);
  const body = compact3({
    merchant_url: requireStringFlag(flags, "missing --merchant-url", "merchant-url"),
    merchant_name: getStringFlag(flags, "merchant-name"),
    merchant_category_code: requireStringFlag(flags, "missing --merchant-category-code", "merchant-category-code"),
    order_channel_id: getStringFlag(flags, "order-channel-id"),
    customer_id: customerId,
    context: { currency },
    buyer,
    line_items: normalizeUcpCheckoutCreateLineItems(requireJsonArrayFlag(flags, "line-items"), currency),
    shipping_address: optionalJsonFlag(flags, "shipping-address"),
    metadata: optionalJsonFlag(flags, "metadata")
  });
  const target = resolveUcpCheckoutRequestTarget(context, "");
  const idempotencyKey = randomUUID4();
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    ...target,
    method: "POST",
    headers: buildUcpCheckoutHeaders(runtimeConfig, target.baseUrl, idempotencyKey),
    body,
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
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
  const checkoutId = requireCheckoutId(flags);
  const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}`);
  const result = await requestOAuthBusinessJson(context, (runtimeConfig) => ({
    ...target,
    method: "GET",
    headers: buildCustomerApiKeyHeaders(runtimeConfig, target.baseUrl),
    timeoutMs: context.globalOptions.timeoutMs,
    dryRun: context.globalOptions.dryRun
  }));
  return finishApiCommand(result, context);
}
async function ucpCheckoutUpdate(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
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
  if (!isRecord8(checkout)) {
    return void 0;
  }
  const direct = asOptionalString(checkout.currency)?.trim();
  if (direct) {
    return direct;
  }
  const checkoutContext = checkout.context;
  if (!isRecord8(checkoutContext)) {
    return void 0;
  }
  const contextual = asOptionalString(checkoutContext.currency)?.trim();
  return contextual || void 0;
}
async function ucpCheckoutComplete(context) {
  const flags = context.args.flags;
  rejectUcpCheckoutUnsupportedFlags(flags);
  if ("credential-token" in flags) {
    throw validationError("--credential-token is not supported on external ucp-checkout complete; pass --payment-instrument-id");
  }
  const checkoutId = requireCheckoutId(flags);
  let paymentInstrumentId = getStringFlag(flags, "payment-instrument-id");
  if (!paymentInstrumentId) {
    paymentInstrumentId = await resolveDefaultPaymentInstrumentId(context);
  }
  const customerId = asRequiredString(context.storedConfig.customerId, "missing customerId; run `clink wallet init` or run `clink config set customer-id <customerId>`");
  const paymentMethodApi = createPaymentMethodApi(context);
  const card = await resolveUcpCheckoutCardContext(context, paymentMethodApi, paymentInstrumentId);
  const target = resolveUcpCheckoutRequestTarget(context, `/${encodeURIComponent(checkoutId)}/complete`);
  const idempotencyKey = randomUUID4();
  const refreshed = await executePaymentRequestWithRefresh({
    request: () => requestOAuthBusinessJson(context, (runtimeConfig) => ({
      ...target,
      method: "POST",
      headers: buildUcpCheckoutHeaders(runtimeConfig, target.baseUrl, idempotencyKey),
      body: buildUcpCheckoutCompleteBody(customerId, paymentInstrumentId, card),
      timeoutMs: context.globalOptions.timeoutMs,
      dryRun: context.globalOptions.dryRun
    })),
    refreshPaymentMethods: paymentMethodApi.refreshPaymentMethods,
    dryRun: context.globalOptions.dryRun
  });
  return finishApiCommand(refreshed.result, context, refreshed.paymentMethodsRefreshWarning);
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
function normalizeUcpCheckoutCreateLineItems(lineItems, currency) {
  return lineItems.map((lineItem, index) => normalizeUcpCheckoutMoneyFields(lineItem, currency, `--line-items[${index}]`, false));
}
function normalizeUcpCheckoutUpdateLineItems(lineItems, currency) {
  return lineItems.map((lineItem, index) => normalizeUcpCheckoutMoneyFields(lineItem, currency, `--line-items[${index}]`, true));
}
function normalizeUcpCheckoutMoneyFields(value, currency, path3, preserveIntegerMinorUnits) {
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeUcpCheckoutMoneyFields(item, currency, `${path3}[${index}]`, preserveIntegerMinorUnits));
  }
  if (!isRecord8(value)) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => {
    const fieldPath = `${path3}.${key}`;
    if (EXTERNAL_CHECKOUT_MONEY_FIELDS.has(key) && shouldNormalizeUcpCheckoutMoneyInput(fieldValue, preserveIntegerMinorUnits)) {
      return [key, majorAmountToMinorUnits(fieldValue, currency, fieldPath)];
    }
    if (EXTERNAL_CHECKOUT_MONEY_FIELDS.has(key) && preserveIntegerMinorUnits && typeof fieldValue === "number" && Number.isInteger(fieldValue)) {
      validateMinorUnitInteger(fieldValue, fieldPath);
    }
    return [
      key,
      normalizeUcpCheckoutMoneyFields(fieldValue, currency, fieldPath, preserveIntegerMinorUnits)
    ];
  }));
}
function isRecord8(value) {
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
function buildUcpCheckoutHeaders(runtimeConfig, requestBaseUrl, idempotencyKey) {
  return {
    ...buildCustomerApiKeyHeaders(runtimeConfig, requestBaseUrl),
    "Idempotency-Key": idempotencyKey
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
  const body = compact3({
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
var INSTRUCTION_CONTEXT_FLAGS = [
  "title",
  "description",
  "mandates",
  "is-recurring",
  "shipping-address",
  "effective-until-time"
];
function instructionContextBody(context) {
  const flags = context.args.flags;
  if ("payment-instrument-id" in flags) {
    throw validationError("--payment-instrument-id is not supported by wallet init; the card is bound after login");
  }
  if ("extra" in flags) {
    throw validationError("--extra is not supported by the wallet init instruction context");
  }
  if (!INSTRUCTION_CONTEXT_FLAGS.some((name) => name in flags)) {
    return void 0;
  }
  const isRecurring = getBooleanFlag(flags, "is-recurring");
  const mandates = normalizeInstructionMandates(requireJsonArrayFlag(flags, "mandates"), isRecurring);
  const title = requireStringFlag(flags, "missing --title", "title");
  if (title.length > 256) {
    throw validationError(`--title must be at most 256 characters, got ${title.length}`);
  }
  const description = getStringFlag(flags, "description");
  if (description !== void 0 && description.length > 1024) {
    throw validationError(`--description must be at most 1024 characters, got ${description.length}`);
  }
  const body = compact3({
    title,
    description,
    effectiveUntilTime: utcDateTimeFlag(flags, "effective-until-time"),
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
var UTC_DATETIME_FORMAT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
function normalizeInstructionMandates(mandates, isRecurring) {
  return mandates.map((mandate, index) => {
    if (!isJsonObject(mandate)) {
      throw validationError(`--mandates[${index}] must be a JSON object`);
    }
    requireMandateText(mandate, "description", index);
    requireMandateAmountLimit(mandate, index);
    requireMandateText(mandate, "currencyCode", index);
    const effectiveUntilTime = mandate.effectiveUntilTime;
    if (effectiveUntilTime !== void 0 && effectiveUntilTime !== null && (typeof effectiveUntilTime !== "string" || !UTC_DATETIME_FORMAT.test(effectiveUntilTime))) {
      throw validationError(`--mandates[${index}].effectiveUntilTime must use UTC datetime format yyyy-MM-dd HH:mm:ss`);
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
    open: context.globalOptions.open,
    targetUrl,
    portalOrigin: resolveAgentBaseUrl(context.runtimeConfig.baseUrl),
    runtimeConfig: context.runtimeConfig,
    ...context.runtimeConfig.email ? { email: context.runtimeConfig.email } : {},
    request: (request) => requestBrowserHandoff(context, request),
    openBrowser: (url) => openBrowserWithResult(true, url)
  });
  await launch.completion;
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
  maybeOpenBrowser(context.globalOptions.open, url);
  printSuccess({ url, instructionId, paymentInstrumentId }, context.globalOptions.format);
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
  if (!isRecord8(data)) {
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
    if (!isRecord8(instruction) || normalizedString(instruction.status) !== "ACTIVE") {
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
  return isRecord8(mandate) && isZeroLike(mandate.reserveStatus);
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
  printSuccess(paymentMethodsRefreshWarning && isRecord8(data) && !Array.isArray(data) ? addPaymentMethodsRefreshWarning(data, paymentMethodsRefreshWarning) : data, context.globalOptions.format);
  return EXIT_CODES.OK;
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
  return instruction[mandateKey].map((mandate) => isRecord8(mandate) ? extractMandateId(mandate) : void 0).filter((mandateId) => mandateId !== void 0);
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
  "catalog",
  "ucp-order",
  "instruction",
  "events",
  "tool",
  "config"
];
async function runEntrypoint(runner, argv, helpCommands) {
  try {
    const exitCode = await runner(argv);
    process.exitCode = exitCode;
  } catch (error) {
    process.exitCode = printError(error, detectErrorPresentation(argv, helpCommands));
  }
}
function detectErrorPresentation(argv, helpCommands) {
  const format = detectFormat(argv);
  const explicitFormat = hasExplicitFormat(argv);
  const helpHint = detectHelpHint(argv, helpCommands);
  return {
    format,
    explicitFormat,
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
function detectHelpHint(argv, helpCommands) {
  const command = argv.find((token) => !token.startsWith("-"));
  if (!command) {
    return "Run `clink --help`.";
  }
  if (helpCommands.includes(command)) {
    return `Run \`clink ${command} --help\`.`;
  }
  return "Run `clink --help`.";
}

// dist/index.js
void runEntrypoint(runCli, process.argv.slice(2), MAIN_HELP_COMMANDS);
