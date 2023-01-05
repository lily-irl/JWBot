import Event from "./Event";
/**
 * The event bus is responsible for handling events.
 * It is created by the core and is passed to packages:
 * packages should not create their own event bus.
 *
 * @class EventBus
 */
class EventBus {
    /**
     * @constructor
     */
    constructor() {
        /**
         * The EventBus stores each event as a key, value
         * pair of each event's name and its corresponding
         * Event object.
         *
         * @property _events
         * @type {object<string, Event>}
         * @private
         */
        this._events = {};
    }

    /**
     * The names of every event we currently have registered
     *
     * @property events
     * @type {string[]}
     */
    get events() {
        return Object.keys(this._events);
    }

    /**
     * Wrapper for determining if an event exists
     *
     * @param {String} eventName
     * @returns {Boolean}
     */
    has(eventName) {
        return this.events.includes(eventName);
    }

    /**
     * Register an observer for an event. If the given
     * event doesn't exist, we will create it.
     *
     * @param {String} eventName
     * @param {Function} callback
     */
    on(eventName, callback) {
        if (!this.has(eventName)) {
            this._events[eventName] = new Event(eventName);
        }

        this._events[eventName].addObserver(callback);
    }

    /**
     * De-register an observer for an event. If this was
     * the last observer, the event will be destroyed.
     *
     * @param {String} eventName
     * @param {Function} callback
     */
    off(eventName, callback) {
        if (!this.has(eventName)) return;

        this._events[eventName].removeObserver(callback);

        if (this._events[eventName].hasNoObservers()) {
            delete this._events[eventName];
        }
    }

    /**
     * Trigger the given event with the specified
     * arguments.
     * 
     * @param {String} eventName
     */
    trigger(eventName, ...args) {
        if (!this.has(eventName)) return;

        const observers = this._events[eventName].observers;

        for (let i = 0; i < observers.length; i++) {
            observers[i](...args);
        }
    }
}

export default new EventBus();
