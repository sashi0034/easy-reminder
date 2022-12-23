import { AllMiddlewareArgs, App, BlockAction, ButtonAction, GenericMessageEvent, SlackAction, SlackActionMiddlewareArgs } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";
import { getRemindButtonBlock, getReminderBlock } from "./mssageBlock";
import { RemindingButton, RemindingButtonMaker as RemindingButtonSource } from "./remidingButton";
import RemindingElement from "./remindingElement";
import SlackActionWrapper from "./slackActionWrapper";
import { sleep, sleepSeconds } from "./util";


const hourSeconds = 60 * 60;

const buttonSources = [
    new RemindingButtonSource("5 seconds later", 5),
    new RemindingButtonSource("30 seconds later", 30),
    new RemindingButtonSource("1 hours later", hourSeconds),
    new RemindingButtonSource("3 hours later", 3 * hourSeconds),
    new RemindingButtonSource("12 hours later", 12 * hourSeconds),
    new RemindingButtonSource("1 day later", 24 * hourSeconds),
    new RemindingButtonSource("1 week later", 7 * 24 * hourSeconds),
]

export default
class EasyReminder{
    private remindingList: RemindingElement[] = []

    private readonly defaultRemindDelay = 6;

    public constructor(
        private readonly slackAction: SlackActionWrapper
    ){}

    public async startProcess(){
        const delayInterval = 1 // sec
        while (true){
            await sleepSeconds(delayInterval);
            
            // リマインド要素を更新
            for (const element of this.remindingList) {
                await this.updateRemindingElement(element, delayInterval);
            }

            // 終わったものは取り除く
            this.remindingList = this.remindingList.filter(remind => remind.isPassedLeftSeconds() === false);
        }
    }

    private async updateRemindingElement(reminding: RemindingElement, passedSec: number){
        reminding.decLeftSeconds(passedSec);
        if (reminding.isPassedLeftSeconds() === false) return;
    
        const buttons = buttonSources.map(button => button.make(reminding.content)).map(getRemindButtonBlock);
        await this.slackAction.postBlockText(reminding.channelId, "remind: " + reminding.content, getReminderBlock(reminding, buttons));
    }


    public onReceivedMessage(message: GenericMessageEvent){
        console.log(message)
        if (message.text === undefined) return;
        const newElement = new RemindingElement(message.text, message.user, message.channel, this.defaultRemindDelay);
        this.remindingList.push(newElement);
    } 

    public subscribeAction(app: App){
        for (const button of buttonSources) {
            app.action(button.actionId, async (e) => {
                this.onPushRemindButton(e, button);
            })
        }
    }

    private onPushRemindButton(
        e: SlackActionMiddlewareArgs<SlackAction> & AllMiddlewareArgs<StringIndexed>, 
        button: RemindingButtonSource
    ) {
        e.ack();

        const body = e.body as BlockAction;

        const newElement = new RemindingElement(
            (e.action as ButtonAction).value,
            body.message?.user ?? "(null)",
            body.container.channelId,
            button.delayedSeconds);
        this.remindingList.push(newElement);

        e.say("set remind: " + button.text + " for " + body.user.name);
    }
}


