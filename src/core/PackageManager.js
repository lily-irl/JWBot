/**
 * The PackageManager loads packages found in the `packages` folder
 * and is responsible for instantiating them, passing the EventBus,
 * registering commands, and doing other things you'd reasonably
 * expect from a class called `PackageManager`.
 */
class PackageManager {
    /**
     * 
     * @param {EventBus} eventBus
     * @constructor
     */
    constructor(eventBus) {
        /**
         * Our copy of the EventBus that will be passed
         * to every package.
         *
         * @property _eventBus
         * @type {EventBus}
         * @private
         */
        this._eventBus = eventBus;

        /**
         * The internal array of packages that we have
         * loaded.
         *
         * @property _packages
         * @type {Package[]}
         * @private
         */
        this._packages = [];
    }
}

export default new PackageManager();
