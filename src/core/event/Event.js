/**
 * The Event class represents an Event
 * that might be triggered by some class and
 * passed through the EventBus.
 * 
 * Every time an event is triggered, it
 * must be represented by an Event object
 * in the EventBus.
 *
 * @class Event
 */
export default class Event {
    /**
     * @constructor
     * @param {String} name
     */
    constructor(name) {
        if (!name) throw new Error('an event must have a name');

        /**
         * The event's name. This is immutable.
         *
         * @property _name
         * @private
         */
        this._name = name;

        /**
         * 'Observers' are a set of callback functions
         * that are listening to this event.
         */
        this.observers = []
    }

    get name() {
        return this._name;
    }

    /**
     *
     * @param {Function} observer 
     * @returns {Boolean}
     */
    hasObserver(observer) {
        return this.observers.includes(observer);
    }

    /**
     *
     * @param {Function} observer
     */
    addObserver(observer) {
        if (!typeof observer === 'function') {
            throw new Error('expected to add an observer function, but got ' + observer);
        }

        if (this.hasObserver(observer)) return;

        this.observers.push(observer);
    }

    /**
     *
     * @param {Function} observer
     */
    removeObserver(observer) {
        if (!typeof observer === 'function') {
            throw new Error('expected to remove an observer function, but got ' + observer);
        }

        if (!this.hasObserver(observer)) return;

        let index = this.observers.indexOf(observer);
        this.observers.splice(index, 1);
    }

    /**
     * 
     * @returns {Boolean}
     */
    hasNoObservers() {
        return this.observers.length === 0;
    }
}
