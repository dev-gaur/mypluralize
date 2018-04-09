var index = require('../dist/index.js');

test('make camel plural', () => {
	expect(index.getPlural("camel")).toBe("camels");
});

test('Make potato plural', () => {
	expect(index.getPlural("potato")).toBe("potatoes");
});