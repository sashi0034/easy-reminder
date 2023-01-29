import { AllMiddlewareArgs, App, BlockAction, ButtonAction, GenericMessageEvent, SlackAction, SlackActionMiddlewareArgs } from "@slack/bolt";
import { StringIndexed } from "@slack/bolt/dist/types/helpers";
import { getRemindButtonBlock, getReminderBlock } from "./mssageBlock";
import { RemindingButton, RemindingButtonMaker as RemindingButtonSource } from "./remidingButton";
import RemindingElement from "./remindingElement";
import SlackActionWrapper from "./slackActionWrapper";
import { sleep, sleepSeconds } from "./util";
import config from "./config.json";
import { getLogger } from "log4js";


const hourSeconds = 60 * 60;

const buttonSources = [
    // new RemindingButtonSource("5 seconds later", 5),
    // new RemindingButtonSource("30 seconds later", 30),
    new RemindingButtonSource("1 hours later", hourSeconds),
    new RemindingButtonSource("3 hours later", 3 * hourSeconds),
    new RemindingButtonSource("6 hours later", 6 * hourSeconds),
    // new RemindingButtonSource("12 hours later", 12 * hourSeconds),
    new RemindingButtonSource("1 day later", 24 * hourSeconds),
    new RemindingButtonSource("1 week later", 7 * 24 * hourSeconds),
]

const literalCmdList = "!list";
const literalCmdNow = "!now";


function checkHeadText(source: string, finding: string){
    if (source === "") return false;

    const head = source.slice(0, finding.length);
    return head === finding;
}

function removeHeadTextAndWhiteSpace(source: string, finding: string){
    if (checkHeadText(source, finding) === false){
        getLogger().warn("source does not include head");
        return source;
    }
    const removedHead = source.slice(finding.length, source.length);
    const removedSpace = removedHead.trim();
    return removedSpace;
}


export default
class EasyReminder{
    private remindingList: RemindingElement[] = []

    private readonly defaultRemindDelay = config.defaultRemindDelay;

    public constructor(
        private readonly slackAction: SlackActionWrapper
    ){}

    public async startProcess(){
        const delayInterval = 5 // sec
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
    
        getLogger().log("start remind");

        const buttons = buttonSources.map(button => button.make(reminding.content)).map(getRemindButtonBlock);
        await this.slackAction.postBlockText(reminding.channelId, "remind: " + reminding.content, getReminderBlock(reminding, buttons));

        getLogger().info(reminding);
    }



    public onReceivedMessage(message: GenericMessageEvent){
        console.log(message)
        if (message.text === undefined) return;
        if (message.text === null) return;
        if (message.text === "") return;
        
        const text = message.text;
        if (checkHeadText(text, literalCmdList) === true){
            // remind listを表示
            this.executeCmdList(message.channel, message.user);
        }else if (checkHeadText(text, literalCmdNow) === true){
            // すぐにremind
            const newElement = new RemindingElement(removeHeadTextAndWhiteSpace(message.text, literalCmdNow), message.user, message.channel, 0);
            this.updateRemindingElement(newElement, 1);
        }
        else {
            // 通常
            const newElement = new RemindingElement(message.text, message.user, message.channel, this.defaultRemindDelay);
            this.remindingList.push(newElement);
            this.slackAction.addEmoji("love_letter", message.channel, message.ts);
        }
    } 

    private async executeCmdList(channelId: string, userId: string){
        let responseText = "";
        for (const remind of this.remindingList) {
            if (remind.channelId !== channelId) continue;
            if (remind.userId !== userId) continue;

            if (responseText !== "") responseText += "\n";
            responseText += remind.content + ` (in ${remind.leftSec} seconds)`;
        }

        if (responseText === "") responseText = "Nothing to remind.";
        await this.slackAction.postMessageAt(channelId, responseText);
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
            body.user?.id ?? "(null)",
            body.channel?.id ?? config.targetChannel,
            button.delayedSeconds);
        this.remindingList.push(newElement);

        e.say("setup reminder: " + button.text + " for " + body.user.name);
    }
}


