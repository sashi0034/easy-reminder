
export default 
class RemindingElement{
    public constructor(
        public readonly content: string,
        public readonly userId: string,
        public readonly channelId: string,
        private leftSeconds: number
    ){}

    public get leftSec() {
        return this.leftSeconds;
    }

    public decLeftSeconds(amount: number){
        this.leftSeconds -= amount;
    }

    public isPassedLeftSeconds(){
        return this.leftSeconds < 0;
    }
}

