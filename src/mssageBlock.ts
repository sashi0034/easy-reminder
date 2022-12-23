import { RemindingButton } from "./remidingButton";
import RemindingElement from "./remindingElement";


type ButtonBlock = {
    type: string;
    text: {
        type: string;
        text: string;
        emoji: boolean;
    };
    value: string;
    action_id: string;
}



export function getReminderBlock(reminding: RemindingElement, buttons: ButtonBlock[]) {
    return [
        {
            "type": "divider"
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `<@${reminding.userId}> ${reminding.content}`
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "plain_text",
                    "text": "Re-reminder :thought_balloon:",
                    "emoji": true
                }
            ]
        },
        {
            "type": "actions",
            "elements": buttons
        }
    ];
}



export function getRemindButtonBlock(button: RemindingButton){
    return {
        "type": "button",
        "text": {
            "type": "plain_text",
            "text": button.text,
            "emoji": true
        },
        "value": button.remindingContent,
        "action_id": button.actionId
    }
}

