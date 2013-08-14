all: clean install test

clean:
	-rm -fr node_modules

install:
	npm install;\
	npm link;

.PHONY : test
test: 
	export NODE_PATH=./node_modules;\
	node_modules/mocha/bin/_mocha --timeout 20s test/log-staging.js

test-debug:
	export NODE_PATH=./node_modules;\
	node_modules/mocha/bin/mocha --debug-brk --timeout 600s test

unpublish:
	npm unpublish

publish:
	npm publish

refresh:
	npm publish --force
