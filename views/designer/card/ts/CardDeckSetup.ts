import Modal from "../../../../system/types/ModalManager";

async function openSettingsModal(): Promise<{[key: string]: any;} | null> {
    const cardDeckSettings = new Modal('Card Deck', 'Configure your card deck settings below.')
        .addTextField('Deck Name', 'My Card Deck', true)
        .addColorField('Card Back Color', '#f00')
        .addMillimeterField('Card Width (mm)', 63.5, true)
        .addMillimeterField('Card Height (mm)', 88.9, true);

    return cardDeckSettings.show();
}

export {
    openSettingsModal
};
