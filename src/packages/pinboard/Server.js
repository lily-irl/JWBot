export default class Server {
    constructor(id, channel, emoji, timeout, threshold) {
        this.id = id;
        this.channel = channel;
        this.emoji = emoji;
        this.timeout = timeout;
        this.threshold = threshold;
    }

    canPin() {
        return this.id && this.channel && this.emoji && this.timeout && this.threshold;
    }
}
