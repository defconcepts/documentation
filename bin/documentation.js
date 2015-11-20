#!/usr/bin/env node

/* eslint no-console: 0 */

'use strict';

var documentation = require('../'),
  chokidar = require('chokidar'),
  debounce = require('debounce'),
  streamArray = require('stream-array'),
  fs = require('fs'),
  vfs = require('vinyl-fs'),
  errorPage = require('../lib/error_page'),
  lint = require('../lib/lint'),
  Server = require('../lib/server'),
  args = require('../lib/args');

var parsedArgs = args(process.argv.slice(2)),
  servingHTML = parsedArgs.serve && parsedArgs.formatter === 'html';

var generator = documentation.bind(null,
  parsedArgs.inputs, parsedArgs.options, onDocumented.bind(null, parsedArgs));

var server = new Server();
server.on('listening', function () {
  process.stdout.write('documentation.js serving on port 4001\n');
});

function onDocumented(parsedArgs, err, comments) {
  if (err) {
    if (servingHTML) {
      return server.setFiles([errorPage(err)]).start();
    }
    throw err;
  }

  if (parsedArgs.command === 'lint') {
    var lintOutput = lint.format(comments);
    if (lintOutput) {
      console.log(lintOutput);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  documentation.formats[parsedArgs.formatter](
    comments, parsedArgs.formatterOptions,
    onFormatted.bind(null, parsedArgs));
}

function onFormatted(parsedArgs, err, output) {
  if (parsedArgs.watch) {
    updateWatcher();
  }

  if (parsedArgs.command === 'serve') {
    server.setFiles(output).start();
  } else if (parsedArgs.output === 'stdout') {
    output.pipe(process.stdout, { end: false });
  } else if (Array.isArray(output)) {
    streamArray(output).pipe(vfs.dest(parsedArgs.output));
  } else {
    fs.writeFileSync(parsedArgs.output, output);
  }
}

if (parsedArgs.watch) {
  var watcher = chokidar.watch(parsedArgs.inputs);
  watcher.on('all', debounce(generator, 300));
} else {
  generator();
}

function updateWatcher() {
  documentation.expandInputs(parsedArgs.inputs, parsedArgs.options, function (err, files) {
    watcher.add(files.map(function (data) {
      return data.file;
    }));
  });
}
