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
var tag = require('gulp-tag-version');


// Transpile typescript files in lib/ to javascript files in dist/
gulp.task('transpile', function tsToJs()  {
	return tsProject.src()
	.pipe(tsProject())
	.js.pipe(gulp.dest('dist'))
})

gulp.task('test', ['transpile'], function(){
	let test = new run.Command('npm test')
	test.exec()
})

gulp.task('bump', function(){
	var argv = require('yargs')
    .option('type', {
        alias: 't',
        choices: ['patch', 'minor', 'major']
	}).argv
 
	return gulp.src(['package.json', 'package-lock.json'])
	// bump package.json version
	.pipe(bump({
		type: argv.type || 'patch'
	}))
	// save the bumped files into filesystem
	.pipe(gulp.dest('./'))
	.pipe(git.add())
	.pipe(git.commit("Bumped up the version."))

})

// 
gulp.task('tag', ['transpile', 'test'], function() {
	let argv = require('yargs')
	.option('note', {
		alias: 'm',
		description: 'Release Note text.',
		type: 'string'
	})
	.argv;

	return gulp.src('./package.json')
	.pipe(through.obj(function(file, err, cb) {
		git.revParse({args:'--abbrev-ref HEAD'}, function (err, branch) {
			if(branch !== 'master') {
				gutil.log(gutil.colors.red.red("Tag releases are only allowed to happen from MASTER branch."))
				throw err
				return
			}
			console.log(argv.note)
			cb(null, file)
		});
	}))
	.pipe(gulp.dest('./'))
	.pipe(filter('package.json'))
	// create tag based on the filtered file
	.pipe(tag({
		label: argv.note || undefined
	}))
	.pipe(through.obj(function(file, enc, cb){
		git.push('origin', ['master', 'develop'], {args: '--tags'}, function (err) {
			if (err) throw err;
			cb(null, file)
		})
	}))
	.on('finish', () => {
		gutil.log(gutil.colors.green.green("Successfully pushed to origin remotes."))		
	})
})

// Merges the current ${branchtype} branch to develop and master branches.
function merge(branchtype) {
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
			if(branch.split("-")[0] !== branchtype) {
				gutil.log(gutil.colors.red.red(`This operation is only allowed for ${branchtype} branches.`))
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
		if (branchtype === 'feature') {
			git.pull('origin', 'develop', {args: '--rebase', maxBuffer: Infinity}, function (err) {
				if (err) {
					gutil.log(gutil.colors.red.red("Error occured while rebasing on DEVELOP branch."))
					throw err
					return
				}
			});
		}
		cb(null, file)
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
		if (branchtype === 'patch' || branchtype === 'release') {
			git.checkout('master', function(err){
				if (err) {
					gutil.log(gutil.colors.red.red("Error occured while checking out MASTER branch."))
					throw err
					return
				}
			
				cb(null, file)
			})
		}
	}))
	.pipe(through.obj(function(file, err, cb) {
		git.merge(currentbranch, function (err) {
			if (err) throw err;
			cb(null, file)
		})
	}))
}

gulp.task('merge-patch', function() {
	return merge('patch')
})

gulp.task('merge-release', function() {
	return merge('release')
})

gulp.task('merge-feature', function() {
	return merge('feature')
})

gulp.task('publish', ['tag'], function (done) {
	// run 'npm publish' on shell
	exec('npm publish', function (error, stdout, stderr) {
			if (stderr) {
				gutil.log(gutil.colors.red(stderr));
			} else if (stdout) {
				gutil.log(gutil.colors.green(stdout));
			}
			// execute callback when its done
			if (done) {
				gutil.log(gutil.colors.green.green("RELEASED! & PUBLISHED!"))
				done();
			}
		}
	);
});
