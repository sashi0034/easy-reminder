import { assert } from "console"

function getActionId(sec: number) {
    return "remind_" + sec;
}

export class RemindingButtonMaker{
    public constructor(
        public readonly text: string,
        public readonly delayedSeconds: number
    ){
        assert(Number.isInteger(delayedSeconds))
    }

    public make(content: string){
        return new RemindingButton(
            this.text,
            content,
            this.delayedSeconds
        );
    }

    public get actionId(){
        return getActionId(this.delayedSeconds);
    }
}

export class RemindingButton{
    public constructor(
        public readonly text: string,
        public readonly remindingContent: string,
        public readonly delayedSeconds: number
    ){
        assert(Number.isInteger(delayedSeconds))
    }

    public get actionId(){
        return getActionId(this.delayedSeconds);
    }
}