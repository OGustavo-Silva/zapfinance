export class Base {
    protected log(message: unknown){
        console.log(`[${this.constructor.name}] ${message}`);
    }
}
