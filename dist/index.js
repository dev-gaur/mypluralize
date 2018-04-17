"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var pluralize = __importStar(require("pluralize"));
/**
 * @method: Returns the plural form of any noun.
 * @param {string}
 * @returns {string}
 */
function getPlural(str) {
    return pluralize.plural(str);
}
exports.getPlural = getPlural;
/**
 * @method: Returns Author name.
 * @returns {string}
 */
function getAuthor() {
    return "Devang Gaur";
}
exports.getAuthor = getAuthor;
