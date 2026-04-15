import Modal from "../../../../system/types/ModalManager";

function getCardVariableFieldLabel(templateOption: string, variableName: string): string {
    return `Variable (${templateOption}): ${variableName}`;
}

function getCardToolIncrementalVariableLabel(templateOption: string): string {
    return `Incremental Parameter (${templateOption})`;
}

function getCardToolStaticValueLabel(templateOption: string, variableName: string): string {
    return `Static (${templateOption}): ${variableName}`;
}

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
        for (const templateOption of templates) {
            const vars = variableMap[templateOption] ?? [];
            for (const key of vars) {
                const label = getCardVariableFieldLabel(templateOption, key);
                const initialVal = initial ? initial[label] ?? '' : '';
                newCardModal.addTextField(label, initialVal, true);
                newCardModal.setConditionalField(label, 'Card Type', templateOption);
            }
        }
    }

    return newCardModal.show();
}

async function openCardToolModal(
    templates: string[],
    variableMap: Record<string, string[]>,
    initial?: Record<string, any>
): Promise<{[key: string]: any;} | null> {
    const typeInitial = initial?.["Card Type"] ?? (templates.length > 0 ? templates[0] : "");
    const startInitial = initial?.["Start Value"] ?? 1;
    const endInitial = initial?.["End Value"] ?? 10;
    const stepInitial = initial?.["Step Value"] ?? 1;

    const modal = new Modal("Card Tool", "Set static values first, then optionally vary one parameter using start/end/step.")
        .addSelectField("Card Type", templates, typeInitial, true);

    for (const templateOption of templates) {
        const vars = variableMap[templateOption] ?? [];
        for (const variableName of vars) {
            const staticLabel = getCardToolStaticValueLabel(templateOption, variableName);
            const staticInitial = initial?.[staticLabel] ?? "";
            modal.addTextField(staticLabel, staticInitial, false);
            modal.setConditionalField(staticLabel, "Card Type", templateOption);
            modal.setConditionalField(staticLabel, getCardToolIncrementalVariableLabel(templateOption), variableName, 'not-equals');
        }

        const differentLabel = getCardToolIncrementalVariableLabel(templateOption);
        const differentInitial = initial?.[differentLabel] ?? "None";
        const differentOptions = ["None", ...vars];
        modal.addSelectField(differentLabel, differentOptions, differentInitial, true);
        modal.setConditionalField(differentLabel, "Card Type", templateOption);
    }

    modal
        .addNumberField("Start Value", startInitial, true)
        .addNumberField("End Value", endInitial, true)
        .addNumberField("Step Value", stepInitial, true);

    return modal.show();
}

export {
    openSettingsModal,
    openNewCardModal,
    getCardVariableFieldLabel,
    getCardToolIncrementalVariableLabel,
    getCardToolStaticValueLabel,
    openCardToolModal
};
