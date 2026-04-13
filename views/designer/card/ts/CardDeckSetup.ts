import Modal from "../../../../system/types/ModalManager";

async function openSettingsModal(initial?: { deckName?: string; backColor?: string; width?: number; height?: number; }): Promise<{[key: string]: any;} | null> {
    const cardDeckSettings = new Modal('Card Deck', 'Configure your card deck settings below.')
        .addTextField('Deck Name', initial?.deckName ?? 'My Card Deck', true)
        .addColorField('Card Back Color', initial?.backColor ?? '#f00')
        .addMillimeterField('Card Width (mm)', initial?.width ?? 63.5, true)
        .addMillimeterField('Card Height (mm)', initial?.height ?? 88.9, true);

    return cardDeckSettings.show();
}

async function openNewCardModal(
    templates: string[],
    variableMap?: Record<string, string[]>,
    initial?: Record<string, any>
): Promise<{[key: string]: any;} | null> {
    const amountInitial = initial?.['Amount of Cards'] ?? 1;
    const typeInitial = initial?.['Card Type'] ?? (templates.length > 0 ? templates[0] : '');

    let newCardModal = new Modal('New Card', 'Create a new card ')
        .addNumberField('Amount of Cards', amountInitial, true)
        .addSelectField('Card Type', templates, typeInitial);

    // If a variable map is provided, add conditional fields per template
    if (variableMap) {
        for (const templateName of templates) {
            const vars = variableMap[templateName] ?? [];
            for (const key of vars) {
                const label = `Variable: ${key}`;
                const initialVal = initial ? initial[label] ?? '' : '';
                newCardModal.addTextField(label, initialVal, true);
                newCardModal.setConditionalField(label, 'Card Type', templateName);
            }
        }
    }

    return newCardModal.show();
}

export {
    openSettingsModal,
    openNewCardModal
};
