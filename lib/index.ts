import * as pluralize from 'pluralize'

/**
 * @method: Returns the plural form of any noun.
 * @param {string}
 * @returns {string}
 */

export function getPlural (str: any): string {
	return pluralize.plural(str)
}

/**
 * @method: Returns Author name.
 * @returns {string}
 */

export function getAuthor (): string {
	return "Devang Gaur"
}
