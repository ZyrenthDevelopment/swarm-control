import { ebsFetch } from "../ebs";
import { cart, closeProcessingModal, openErrorModal } from "./modal";
import { getConfigVersion } from "./redeems";
import { Transaction } from "../common-types";

const $modal = document.getElementById("modal-confirm")!;
const $modalProcessing = document.getElementById("modal-processing")!;
const $loginPopup = document.getElementById("onboarding")!;
const $loginButton = document.getElementById("twitch-login")!;

document.addEventListener("DOMContentLoaded", () => {
    $loginButton.onclick = Twitch.ext.actions.requestIdShare;
});

Twitch.ext.onAuthorized(() => {
    if (Twitch.ext.viewer.id) {
        $loginPopup.style.display = "none";
    }
});

Twitch.ext.bits.onTransactionComplete(async transaction => {
    const result = await ebsFetch("/public/transaction", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ...cart!,
            receipt: transaction.transactionReceipt,
            version: await getConfigVersion(),
        } satisfies Transaction),
    });

    closeProcessingModal();

    // TODO: make this look nice \/
    if (result.ok) {
        const element = document.createElement('div');
        element.innerHTML = `OK! ${await result.text()}`;
        element.style.color = "green";
        document.body.appendChild(element);
        $modal.style.display = "none";
    } else {
        /* const element = document.createElement('div');
        element.innerHTML = `FAIL ${result.status} ${result.statusText}! ${await result.text()}`;
        element.style.color = "red";
        document.body.appendChild(element); */
        openErrorModal(`${result.status} ${result.statusText} - ${await result.text()}`);
    }
})
