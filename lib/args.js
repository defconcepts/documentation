var path = require('path'),
  yargs = require('yargs'),
  loadConfig = require('../lib/load_config.js');

function parse(args) {
  // reset() needs to be called at parse time because the yargs module uses an
  // internal global variable to hold option state
  return yargs.reset()
  .usage('Usage: $0 <command> [options]')

  .demand(1)

  .command('build', 'build documentation')
  .command('lint', 'check for common style and uniformity mistakes')
  .command('serve', 'generate, update, and display HTML documentation')

  .version(function () {
    return require('../package').version;
  })

  .help('help')
  .alias('help', 'h')

  .option('format', {
    alias: 'f',
    default: 'json',
    choices: ['json', 'md', 'html']
  })
  .option('watch', {
    describe: 'watch input files and rebuild documentation when they change',
    alias: 'w',
    type: 'boolean'
  })
  .option('theme', {
    describe: 'specify a theme: this must be a valid theme module',
    alias: 't'
  })
  .option('private', {
    describe: 'generate documentation tagged as private',
    type: 'boolean',
    default: false,
    alias: 'p'
  })
  .option('name', {
    describe: 'project name. by default, inferred from package.json'
  })
  .option('project-version', {
    describe: 'project version. by default, inferred from package.json'
  })
  .option('shallow', {
    describe: 'shallow mode turns off dependency resolution, ' +
    'only processing the specified files (or the main script specified in package.json)',
    default: false,
    type: 'boolean'
  })
  .option('polyglot', {
    type: 'boolean',
    describe: 'polyglot mode turns off dependency resolution and ' +
      'enables multi-language support. use this to document c++'
  })
  .option('github', {
    type: 'boolean',
    describe: 'infer links to github in documentation',
    alias: 'g'
  })
  .option('config', {
    describe: 'configuration file. an array defining explicit sort order',
    alias: 'c'
  })
  .option('output', {
    describe: 'output location. omit for stdout, otherwise is a filename ' +
      'for single-file outputs and a directory name for multi-file outputs like html',
    default: 'stdout',
    alias: 'o'
  })

  .example('$0 build foo.js -f md > API.md', 'parse documentation in a ' +
    'file and generate API documentation as Markdown')

  .example('$0 lint project.js', 'check documentation style')

  .parse(args)
}

/**
 * Parse and validate command-line options for documentation.
 * @param {Array} args The array of arguments to parse; e.g. process.argv.slice(2).
 * @return {object} {inputs, options, formatter, formatterOptions, output}
 * @private
 */
module.exports = function (args) {
  var argv = parse(args);

  var command = argv._[0],
    inputs = argv._.slice(1);

  var name = argv.name,
    version = argv['project-version'],
    transform;

  if (inputs.length == 0) {
    try {
      var p = require(path.resolve('package.json'));
      inputs = [p.main || 'index.js'];
      name = name || p.name;
      version = version || p.version;
      if (p.browserify && p.browserify.transform) {
        transform = p.browserify.transform;
      }
    } catch (e) {
      yargs.showHelp();
      throw new Error('documentation was given no files and was not run in a module directory');
    }
  }

  if (argv.f === 'html' && argv.o === 'stdout' && !argv.serve) {
    yargs.showHelp();
    throw new Error('The HTML output mode requires a destination directory set with -o');
  }

  if (argv.command === 'serve') {
    argv.format = 'html';
  }

  var config = {};

  if (argv.config) {
    config = loadConfig(argv.config);
  }

  return {
    inputs: inputs,
    command: command,
    options: {
      private: argv.private,
      transform: transform,
      github: argv.github,
      polyglot: argv.polyglot,
      order: config.order || [],
      shallow: argv.shallow
    },
    formatter: argv.f,
    watch: argv.w,
    formatterOptions: {
      name: name,
      version: version,
      theme: argv.theme
    },
    output: argv.o
  }
}


