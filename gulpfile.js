const {Readable, Writable} = require('stream');

let gulp = require('gulp')
let ts = require('gulp-typescript')
let through = require("through2")
let tsProject = ts.createProject("tsconfig.json")
var run = require('gulp-run')
var bump = require('gulp-bump');
var git  = require('gulp-git');
var gutil = require('gulp-util');
var filter = require('gulp-filter');
var exec = require('child_process').exec;
var argv = require('yargs')
    .option('type', {
        alias: 't',
        choices: ['patch', 'minor', 'major']
	})
	.option('note', {
		alias: 'm',
		description: 'Release Note text.',
		type: 'string'
	})
	.argv;
var tag = require('gulp-tag-version');

gulp.task('default', ['watch'], function () {
	console.log('Starting')
})

gulp.task('test', function(){
	let jest = new run.Command('npm test')
	jest.exec()
})

// Transpile typescript to javascript
gulp.task('transpile', function tsToJs()  {
	return tsProject.src()
	.pipe(tsProject())
	.js.pipe(gulp.dest('dist'))
})

gulp.task('tag', ['transpile', 'test'], function() {

	return gulp.src('./')
	.pipe(through.obj(function(file, err, cb) {
		git.revParse({args:'--abbrev-ref HEAD'}, function (err, branch) {
			if(branch !== 'master') {
				gutil.log(gutil.colors.red.red("Tag releases are only allowed to happen from MASTER branch."))
				throw err
				return
			}

			cb(null, file)
		});  
	}))
	.pipe(filter('package.json'))
	// create tag based on the filtered file
	.pipe(tag({
		label: argv.note || undefined
	}))
	.pipe(gulp.dest("./"))
	.pipe(through(function(file, enc, cb){
		git.push('origin', ['master', 'develop'], {args: " --tags"}, function (err) {
			if (err) throw err;
			cb(null, file)
		})
	}))
	.on('finish', () => {
		gutil.log(gutil.colors.green.green("Successfully push to origin remotes."))		
	})
})

// Merges the current release or patch branche to develop and master branches.
gulp.task('merge', function() {
	let currentbranch;

	let outtempStream = new Writable({
		write(chunk, encoding, callback) {
			currentbranch = chunk.toString()
			console.log(currentbranch)
			callback()
		}
	})
	let intempStream = new Readable()

	return gulp.src('./')
	.pipe(through.obj(function(file, err, cb) {
		git.revParse({args:'--abbrev-ref HEAD'}, function (err, branch) {
			if(branch.split("-")[0] !== 'release' || branch.split("-")[0] !== 'patch') {
				gutil.log(gutil.colors.red.red("This operation is only allowed for release and patch branches."))
				throw err
				return
			}

			intempStream.push(branch)
			intempStream.push(null)
			intempStream.pipe(outtempStream)

			cb(null, file)
		});  
	}))
	.pipe(through.obj(function(file, err, cb) {
		git.checkout('develop', function(err){
			if (err) {
				gutil.log(gutil.colors.red.red("Error occured while checking out DEVELOP branch."))
				throw err
				return
			}
			
			cb(null, file)
		})
	}))
	.pipe(through.obj(function(file, err, cb) {
		git.merge(currentbranch, function (err) {
			if (err) throw err;
			cb(null, file)
		})
	}))
	.pipe(through.obj(function(file, err, cb) {
		git.checkout('master', function(err){
			if (err) {
				gutil.log(gutil.colors.red.red("Error occured while checking out MASTER branch."))
				throw err
				return
			}
			
			cb(null, file)
		})
	}))
	.pipe(through.obj(function(file, err, cb) {
		git.merge(currentbranch, function (err) {
			if (err) throw err;
			cb(null, file)
		})
	}))

})

gulp.task('publish', ['tag'], function (done) {
	// run npm publish terminal command
	exec('npm publish',
		function (error, stdout, stderr) {
			if (stderr) {
				gutil.log(gutil.colors.red(stderr));
			} else if (stdout) {
				gutil.log(gutil.colors.green(stdout));
			}
			// execute callback when its done
			if (done) {
				  done();
			}
		}
	);
});
   
gulp.task('release', ['publish'], function () {
	gutil.log(gutil.colors.green.green("RELEASED! & PUBLISHED!"))
});





/*
 * ARCHIVE *
gulp.task('bump', ['transpile', 'test'], function() {
	let newTag
	let outTagStream = new Writable({
		write(chunk, encoding, callback) {
			newTag = chunk.toString()
			console.log(newTag)
			callback()
		}
	})
	let inTagStream = new Readable()

	return gulp.src('./package.json')
		.pipe(through.obj(function(file, err, cb) {
			git.revParse({args:'--abbrev-ref HEAD'}, function (err, branch) {
				if(branch !== 'master') {
					gutil.log(gutil.colors.red.red("Releases are only allowed to happen from MASTER branch."))
					throw err
					return
				}

				cb(null, file)
			});  
		}))
		// bump package.json version
		.pipe(bump({
			type: argv.type || 'patch'
		}))
		// save the bumped files into filesystem
		.pipe(gulp.dest('./'))
		.pipe(through.obj(function (file, enc, cb) {

			let tag = require('./package.json').version
			inTagStream.push(tag)
			inTagStream.push(null)
			inTagStream.pipe(outTagStream)

			cb(null, file)
		}))
		//.pipe(git.add('package-lock.json'))
		// commit the changed files
		.pipe(git.commit('Bumped up the version.'))
		// filter one file
		.pipe(filter('package.json'))
		// create tag based on the filtered file
		.pipe(tag({
			label: argv.note || undefined
		}))
		.pipe(through.obj(function(file, err, cb) {
			let branchname = 'release-v' + newTag
			git.checkout(branchname, {args:'-b'}, function(err){
				if (err) {
					gutil.log(gutil.colors.red.red("Error occured while creating and checking out to new feature branch."))
					throw err
					return
				}
				
				cb(null, file)
			})
		}))
		.pipe(through.obj(function(file, err, cb) {
			git.checkout('master', function(err){
				if (err) {
					gutil.log(gutil.colors.red.red("Error occured while checking out MASTER branch."))
					throw err
					return
				}
				
				cb(null, file)
			})
		}))
		.pipe(through.obj(function(file, err, cb) {
			git.push('origin', ['master', 'develop', 'release-v' + newTag], function(err){
				if (err) {
					gutil.log(gutil.colors.red.red("Error occured while pushing to origin."))
					throw err
					return
				}

				cb(null, file)
			})
		}))

});
*/