import {
    Card,
    type CardLayoutElement,
    type CardSpecification,
    type CardStyleInterface
} from "../../../system/boardgame/cards/Card";
import { CardDeck } from "../../../system/boardgame/cards/CardDeck";
import {
    openSettingsModal,
    openNewCardModal,
    openCardToolModal,
    getCardVariableFieldLabel,
    getCardToolIncrementalVariableLabel,
    getCardToolStaticValueLabel
} from "./ts/CardDeckSetup";
import Modal from "../../../system/types/ModalManager";
import { 
    type EditorTemplate, 
    type EditorLayoutElement, 
    type EditorDocument, 
    createDefaultStyle, 
    type EditorCardStyle, 
    type MediaAsset,
    createDefaultDocument,
    createDefaultTemplate
} from "./ts/DefaultTemplates";

type ViewMode = "single" | "deck";
type DragAction = "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se";
type MediaTarget = "front-bg" | "element-image" | null;
type HeaderMenuKind = "file" | "edit" | "view";

type DeckRowInstance = {
    row: Record<string, string>;
    rowIndex: number;
    copyIndex: number;
    cardIndex: number;
    template: EditorTemplate;
};

type DragState = {
    action: DragAction;
    index: number;
    startX: number;
    startY: number;
    startElement: EditorLayoutElement;
    historyBefore: string;
};

type ClipboardPayload =
    | {
        kind: "element";
        element: EditorLayoutElement;
    }
    | {
        kind: "template";
        template: EditorTemplate;
    };

type EditorState = {
    viewMode: ViewMode;
    selectedElementIndex: number | null;
    selectedRowIndex: number;
    snapEnabled: boolean;
    gridSizeMm: number;
    dirty: boolean;
    drag: DragState | null;
    pendingUploadTarget: MediaTarget;
    doc: EditorDocument;
    historyPast: string[];
    historyFuture: string[];
    clipboard: ClipboardPayload | null;
};

type FocusSnapshot = {
    key: string;
    selectionStart: number | null;
    selectionEnd: number | null;
};

const CARD_DECK_PREFIX = "boardgame.card-deck";
const DESIGNER_PREFIX = "boardgame.card-designer";
const DESIGNER_DRAFT_KEY = `${DESIGNER_PREFIX}:draft`;
const HISTORY_LIMIT = 100;
const AUTOSAVE_DELAY_MS = 600;

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}


const state: EditorState = {
    viewMode: "single",
    selectedElementIndex: 0,
    selectedRowIndex: 0,
    snapEnabled: true,
    gridSizeMm: 1,
    dirty: false,
    drag: null,
    pendingUploadTarget: null,
    doc: createDefaultDocument(),
    historyPast: [],
    historyFuture: [],
    clipboard: null
};

let dom: ReturnType<typeof getDomRefs> | null = null;
let savedDecksModalTrigger: HTMLElement | null = null;
let activeHeaderMenu: HeaderMenuKind | null = null;
let headerMenuCloseTimer: number | null = null;
let autosaveTimer: number | null = null;

document.addEventListener("DOMContentLoaded", () => {
    dom = getDomRefs();
    bindEvents();
    restoreTemporaryDesignerDocument();
    renderAll();
});

function getDomRefs() {
    const refs = {
        renderCard: document.getElementById("render-card") as HTMLDivElement,
        headerMenus: Array.from(document.querySelectorAll("[data-header-menu]")) as HTMLDivElement[],
        headerMenuToggles: Array.from(document.querySelectorAll("[data-menu-toggle]")) as HTMLButtonElement[],
        headerMenuItems: Array.from(document.querySelectorAll(".header-menu-item")) as HTMLButtonElement[],
        templateSelect: document.getElementById("template-select") as HTMLSelectElement,
        // card width/height moved to header modal; sidebar inputs removed
            headerDeckName: document.getElementById("header-deck-name") as HTMLButtonElement,
            headerCardSize: document.getElementById("header-card-size") as HTMLSpanElement,
        // front text inputs moved to header/modal; removed from sidebar
        elementTypeInput: document.getElementById("element-type-input") as HTMLInputElement,
        elementSelectionHint: document.getElementById("element-selection-hint") as HTMLParagraphElement,
        elementTextField: document.getElementById("element-text-field") as HTMLLabelElement,
        elementImageField: document.getElementById("element-image-field") as HTMLLabelElement,
        elementImageActions: document.getElementById("element-image-actions") as HTMLDivElement,
        elementContentInput: document.getElementById("element-content-input") as HTMLTextAreaElement,
        elementMediaSelect: document.getElementById("element-media-select") as HTMLSelectElement,
        elementXInput: document.getElementById("element-x-input") as HTMLInputElement,
        elementYInput: document.getElementById("element-y-input") as HTMLInputElement,
        elementWidthInput: document.getElementById("element-width-input") as HTMLInputElement,
        elementHeightInput: document.getElementById("element-height-input") as HTMLInputElement,
        elementCenteredInput: document.getElementById("element-centered-input") as HTMLInputElement,
        elementColorPickerInput: document.getElementById("element-color-picker-input") as HTMLInputElement,
        elementColorInput: document.getElementById("element-color-input") as HTMLInputElement,
        elementBgColorPickerInput: document.getElementById("element-bg-color-picker-input") as HTMLInputElement,
        elementBgInput: document.getElementById("element-bg-input") as HTMLInputElement,
        styleFontFamilyInput: document.getElementById("style-font-family-input") as HTMLSelectElement,
        styleFontSizeInput: document.getElementById("style-font-size-input") as HTMLInputElement,
        styleFontWeightInput: document.getElementById("style-font-weight-input") as HTMLSelectElement,
        styleBorderStyleInput: document.getElementById("style-border-style-input") as HTMLSelectElement,
        styleBorderWidthInput: document.getElementById("style-border-width-input") as HTMLInputElement,
        styleBorderColorPickerInput: document.getElementById("style-border-color-picker-input") as HTMLInputElement,
        styleBorderColorInput: document.getElementById("style-border-color-input") as HTMLInputElement,
        styleBorderRadiusInput: document.getElementById("style-border-radius-input") as HTMLInputElement,
        stylePaddingInput: document.getElementById("style-padding-input") as HTMLInputElement,
        styleMarginInput: document.getElementById("style-margin-input") as HTMLInputElement,
        styleGradientStartInput: document.getElementById("style-gradient-start-input") as HTMLInputElement,
        styleGradientEndInput: document.getElementById("style-gradient-end-input") as HTMLInputElement,
        styleGradientAngleInput: document.getElementById("style-gradient-angle-input") as HTMLInputElement,
        styleApplyGradientBtn: document.getElementById("style-apply-gradient-btn") as HTMLButtonElement,
        styleFlexCenterBtn: document.getElementById("style-flex-center-btn") as HTMLButtonElement,
        styleFlexRowBtn: document.getElementById("style-flex-row-btn") as HTMLButtonElement,
        styleTextLeftBtn: document.getElementById("style-text-left-btn") as HTMLButtonElement,
        styleTextCenterBtn: document.getElementById("style-text-center-btn") as HTMLButtonElement,
        styleClearUtilsBtn: document.getElementById("style-clear-utils-btn") as HTMLButtonElement,
        elementStyleInput: document.getElementById("element-style-input") as HTMLTextAreaElement,
        snapEnabledInput: document.getElementById("snap-enabled-input") as HTMLInputElement,
        gridSizeInput: document.getElementById("grid-size-input") as HTMLInputElement,
        statusLabel: document.getElementById("status-label") as HTMLParagraphElement,
        newVariableInput: document.getElementById("new-variable-input") as HTMLInputElement | null,
        variableSelect: document.getElementById("variable-select") as HTMLSelectElement | null,
        dataTable: document.getElementById("row-card-grid") as HTMLDivElement,
        importJsonFile: document.getElementById("import-json-file") as HTMLInputElement,
        mediaUploadInput: document.getElementById("media-upload-input") as HTMLInputElement,
        tabButtons: Array.from(document.querySelectorAll("[data-sidebar-tab]")) as HTMLButtonElement[],
        tabContents: Array.from(document.querySelectorAll("[data-sidebar-content]")) as HTMLElement[],
        viewButtons: Array.from(document.querySelectorAll("[data-view-mode]")) as HTMLButtonElement[],
        addTemplateBtn: document.getElementById("add-template-btn") as HTMLButtonElement,
        duplicateTemplateBtn: document.getElementById("duplicate-template-btn") as HTMLButtonElement,
        renameTemplateBtn: document.getElementById("rename-template-btn") as HTMLButtonElement,
        deleteTemplateBtn: document.getElementById("delete-template-btn") as HTMLButtonElement,
        addTextBtn: document.getElementById("add-text-btn") as HTMLButtonElement,
        addImageBtn: document.getElementById("add-image-btn") as HTMLButtonElement,
        duplicateElementBtn: document.getElementById("duplicate-element-btn") as HTMLButtonElement,
        deleteElementBtn: document.getElementById("delete-element-btn") as HTMLButtonElement,
        layerFrontBtn: document.getElementById("layer-front-btn") as HTMLButtonElement,
        layerForwardBtn: document.getElementById("layer-forward-btn") as HTMLButtonElement,
        layerBackwardBtn: document.getElementById("layer-backward-btn") as HTMLButtonElement,
        layerBackBtn: document.getElementById("layer-back-btn") as HTMLButtonElement,
        undoBtn: document.getElementById("undo-btn") as HTMLButtonElement,
        redoBtn: document.getElementById("redo-btn") as HTMLButtonElement,
        addVariableBtn: document.getElementById("add-variable-btn") as HTMLButtonElement,
        deleteVariableBtn: document.getElementById("delete-variable-btn") as HTMLButtonElement,
        addRowBtn: document.getElementById("add-row-btn") as HTMLButtonElement,
        cardToolBtn: document.getElementById("card-tool-btn") as HTMLButtonElement,
        removeRowBtn: document.getElementById("remove-row-btn") as HTMLButtonElement,
        // upload/clear front bg buttons removed from sidebar
        uploadElementMediaBtn: document.getElementById("upload-element-media-btn") as HTMLButtonElement,
        clearElementMediaBtn: document.getElementById("clear-element-media-btn") as HTMLButtonElement,
        toastStack: document.getElementById("toast-stack") as HTMLDivElement,
        savedDecksModal: document.getElementById("saved-decks-modal") as HTMLDialogElement,
        savedDecksGrid: document.getElementById("saved-decks-grid") as HTMLDivElement,
        savedDecksCloseBtn: document.getElementById("saved-decks-close-btn") as HTMLButtonElement,
        dialog: document.getElementById("designer-dialog") as HTMLDialogElement,
        dialogTitle: document.getElementById("dialog-title") as HTMLHeadingElement,
        dialogMessage: document.getElementById("dialog-message") as HTMLParagraphElement,
        dialogTextField: document.getElementById("dialog-text-field") as HTMLLabelElement,
        dialogTextLabel: document.getElementById("dialog-text-label") as HTMLSpanElement,
        dialogTextInput: document.getElementById("dialog-text-input") as HTMLInputElement,
        dialogSelectField: document.getElementById("dialog-select-field") as HTMLLabelElement,
        dialogSelectLabel: document.getElementById("dialog-select-label") as HTMLSpanElement,
        dialogSelectInput: document.getElementById("dialog-select-input") as HTMLSelectElement,
        dialogCancelBtn: document.getElementById("dialog-cancel-btn") as HTMLButtonElement,
        dialogConfirmBtn: document.getElementById("dialog-confirm-btn") as HTMLButtonElement,
        contextMenu: document.getElementById("designer-context-menu") as HTMLDivElement,
        contextMenuItems: Array.from(document.querySelectorAll(".designer-context-menu-item")) as HTMLButtonElement[]
    };

    const focusMap: Array<[HTMLElement, string]> = [
        [refs.templateSelect, "id:template-select"],
        // removed card width/height focus entries
        [refs.headerCardSize, "id:header-card-size"],
        [refs.headerDeckName, "id:header-deck-name"],
        // header fields handled via headerCardSize/headerDeckName/headerBackColor
            [refs.elementContentInput, "id:element-content-input"],
        [refs.elementMediaSelect, "id:element-media-select"],
        [refs.elementXInput, "id:element-x-input"],
        [refs.elementYInput, "id:element-y-input"],
        [refs.elementWidthInput, "id:element-width-input"],
        [refs.elementHeightInput, "id:element-height-input"],
        [refs.elementColorPickerInput, "id:element-color-picker-input"],
        [refs.elementColorInput, "id:element-color-input"],
        [refs.elementBgColorPickerInput, "id:element-bg-color-picker-input"],
        [refs.elementBgInput, "id:element-bg-input"],
        [refs.elementStyleInput, "id:element-style-input"],
        [refs.gridSizeInput, "id:grid-size-input"]
    ];

    focusMap.forEach(([element, key]) => {
        if (!element) return;
        element.dataset.focusKey = key;
    });

    return refs;
}

function bindEvents() {
    if (!dom) {
        return;
    }

    dom.tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tab = button.dataset.sidebarTab;
            if (!tab) {
                return;
            }
            setSidebarTab(tab);
        });
    });

    dom.viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.viewMode = button.dataset.viewMode === "deck" ? "deck" : "single";
            renderAll();
        });
    });

    initHeaderMenus();

    dom.headerDeckName.addEventListener("click", () => {
        runHeaderMenuAction("file", "settings");
    });

    dom.savedDecksCloseBtn.addEventListener("click", closeSavedDeckModal);
    dom.savedDecksModal.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        if (target === dom?.savedDecksModal) {
            closeSavedDeckModal();
        }
    });
    dom.savedDecksModal.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeSavedDeckModal();
    });
    dom.importJsonFile.addEventListener("change", importDeckFromFile);


    dom.templateSelect.addEventListener("change", () => {
        const nextId = dom?.templateSelect.value;
        if (!nextId) {
            return;
        }
        state.doc.activeTemplateId = nextId;
        state.selectedElementIndex = getActiveTemplate().spec.layout.length > 0 ? 0 : null;
        renderAll();
    });

    dom.addTemplateBtn.addEventListener("click", async () => {
        const templateCount = state.doc.templates.length + 1;
        const modal = new Modal('New Template', 'Create a new template')
            .addTextField('Template Name', `Template ${templateCount}`, true)
            .addChipField('Variables', []);

        const result = await modal.show();
        if (!result) return;

        const name = String(result['Template Name'] || `Template ${templateCount}`).trim();
        const vars = Array.isArray(result['Variables']) ? result['Variables'].map(String) : [];

        applyMutation(() => {
            const newTemplate = createDefaultTemplate(name);
            newTemplate.spec.width = getActiveTemplate().spec.width;
            newTemplate.spec.height = getActiveTemplate().spec.height;
            newTemplate.variables = vars;
            state.doc.templates.push(newTemplate);
            state.doc.activeTemplateId = newTemplate.id;
            state.selectedElementIndex = newTemplate.spec.layout.length > 0 ? 0 : null;
        });
    });

    dom.duplicateTemplateBtn.addEventListener("click", () => {
        applyMutation(() => {
            const active = clone(getActiveTemplate());
            active.id = crypto.randomUUID();
            active.name = `${active.name} Copy`;
            active.spec.uuid = crypto.randomUUID();
            for (const element of active.spec.layout) {
                element.id = crypto.randomUUID();
            }
            state.doc.templates.push(active);
            state.doc.activeTemplateId = active.id;
            state.selectedElementIndex = active.spec.layout.length > 0 ? 0 : null;
        });
    });

    dom.renameTemplateBtn.addEventListener("click", async () => {
        const current = getActiveTemplate();
        const modal = new Modal('Edit Template', 'Edit template name and variables')
            .addTextField('Template Name', current.name, true)
            .addChipField('Variables', current.variables ?? []);

        const result = await modal.show();
        if (!result) {
            return;
        }

        applyMutation(() => {
            const newName = String(result['Template Name'] || current.name).trim();
            current.name = newName || current.name;
            const vars = Array.isArray(result['Variables']) ? result['Variables'].map(String) : [];
            current.variables = vars;
            // ensure existing rows for this template have fields for variables
            for (let i = 0; i < state.doc.sampleRows.length; i++) {
                if (state.doc.rowTemplateIds[i] === current.id) {
                    const row = state.doc.sampleRows[i];
                    if (!row) continue;
                    for (const v of vars) {
                        if (!(v in row)) {
                            row[v] = "";
                        }
                    }
                }
            }
        });
        setStatus("Template updated");
    });

    dom.deleteTemplateBtn.addEventListener("click", () => {
        if (state.doc.templates.length <= 1) {
            setStatus("At least one template is required");
            return;
        }

        const template = getActiveTemplate();
        if (!confirm(`Delete template '${template.name}'?`)) {
            return;
        }

        applyMutation(() => {
            state.doc.templates = state.doc.templates.filter((candidate) => candidate.id !== template.id);
            const fallback = state.doc.templates[0];
            if (!fallback) {
                return;
            }
            state.doc.activeTemplateId = fallback.id;
            state.doc.rowTemplateIds = state.doc.rowTemplateIds.map((id) => (id === template.id ? fallback.id : id));
            state.selectedElementIndex = fallback.spec.layout.length > 0 ? 0 : null;
        });
    });

    // sidebar card width/height inputs removed; size changes handled via Page Setup modal in header

    // front/background controls removed from sidebar; settings are handled via header modal

    dom.addTextBtn.addEventListener("click", () => {
        applyMutation(() => {
            const layout = getActiveTemplate().spec.layout;
            layout.push({
                id: crypto.randomUUID(),
                type: "text",
                content: "{newVariable}",
                posX: 8,
                posY: 8,
                width: 30,
                height: 10,
                style: createDefaultStyle()
            });
            state.selectedElementIndex = layout.length - 1;
        });
    });

    dom.addImageBtn.addEventListener("click", () => {
        applyMutation(() => {
            const layout = getActiveTemplate().spec.layout;
            layout.push({
                id: crypto.randomUUID(),
                type: "image",
                content: "",
                posX: 10,
                posY: 18,
                width: 42,
                height: 42,
                style: {
                    type: "color",
                    background: "transparent",
                    textColor: "#111111"
                }
            });
            state.selectedElementIndex = layout.length - 1;
        });
    });

    dom.duplicateElementBtn.addEventListener("click", () => {
        const element = getSelectedElement();
        if (!element) {
            return;
        }
        applyMutation(() => {
            const copy = clone(element);
            copy.id = crypto.randomUUID();
            copy.posX += 3;
            copy.posY += 3;
            const layout = getActiveTemplate().spec.layout;
            layout.push(copy);
            state.selectedElementIndex = layout.length - 1;
        });
    });

    dom.deleteElementBtn.addEventListener("click", () => {
        if (state.selectedElementIndex === null) {
            return;
        }
        applyMutation(() => {
            const layout = getActiveTemplate().spec.layout;
            layout.splice(state.selectedElementIndex as number, 1);
            if (layout.length === 0) {
                state.selectedElementIndex = null;
                return;
            }
            state.selectedElementIndex = Math.min(layout.length - 1, state.selectedElementIndex as number);
        });
    });

    dom.layerFrontBtn.addEventListener("click", () => moveLayer("front"));
    dom.layerForwardBtn.addEventListener("click", () => moveLayer("forward"));
    dom.layerBackwardBtn.addEventListener("click", () => moveLayer("backward"));
    dom.layerBackBtn.addEventListener("click", () => moveLayer("back"));

    dom.elementContentInput.addEventListener("input", () => {
        applyElementMutation((element) => {
            element.content = dom?.elementContentInput.value ?? "";
        }, false);
        renderAll();
    });

    dom.elementMediaSelect.addEventListener("change", () => {
        applyElementMutation((element) => {
            element.contentMediaId = dom?.elementMediaSelect.value || undefined;
            if (element.contentMediaId) {
                element.type = "image";
            }
        });
    });

    dom.uploadElementMediaBtn.addEventListener("click", () => {
        if (!getSelectedElement()) {
            setStatus("Select an element first");
            return;
        }
        state.pendingUploadTarget = "element-image";
        dom?.mediaUploadInput.click();
    });

    dom.clearElementMediaBtn.addEventListener("click", () => {
        applyElementMutation((element) => {
            element.contentMediaId = undefined;
        });
    });

    dom.elementXInput.addEventListener("change", () => {
        applyElementMutation((element) => {
            element.posX = sanitizeCoordinate(Number(dom?.elementXInput.value));
        });
    });

    dom.elementYInput.addEventListener("change", () => {
        applyElementMutation((element) => {
            element.posY = sanitizeCoordinate(Number(dom?.elementYInput.value));
        });
    });

    dom.elementWidthInput.addEventListener("change", () => {
        applyElementMutation((element) => {
            element.width = clampNumber(Number(dom?.elementWidthInput.value), 1, 1000);
        });
    });

    dom.elementHeightInput.addEventListener("change", () => {
        applyElementMutation((element) => {
            element.height = clampNumber(Number(dom?.elementHeightInput.value), 1, 1000);
        });
    });

    dom.elementCenteredInput.addEventListener("change", () => {
        applyElementMutation((element) => {
            element.centered = dom?.elementCenteredInput.checked;
        });
    });

    dom.elementColorPickerInput.addEventListener("input", () => {
        const value = dom?.elementColorPickerInput.value || "#111111";
        if (dom) {
            dom.elementColorInput.value = value;
        }
        applyElementMutation((element) => {
            ensureElementStyle(element).textColor = value;
        }, false);
        renderAll();
    });

    dom.elementColorInput.addEventListener("input", () => {
        const value = dom?.elementColorInput.value.trim() || "#111111";
        applyElementMutation((element) => {
            ensureElementStyle(element).textColor = value;
        }, false);
        syncColorInput(dom?.elementColorPickerInput, value, "#111111");
        renderAll();
    });

    dom.elementBgColorPickerInput.addEventListener("input", () => {
        const value = dom?.elementBgColorPickerInput.value || "#ffffff";
        if (dom) {
            dom.elementBgInput.value = value;
        }
        applyElementMutation((element) => {
            ensureElementStyle(element).background = value;
        }, false);
        renderAll();
    });

    dom.elementBgInput.addEventListener("input", () => {
        const value = dom?.elementBgInput.value.trim() || "transparent";
        applyElementMutation((element) => {
            ensureElementStyle(element).background = value;
        }, false);
        syncColorInput(dom?.elementBgColorPickerInput, value, "#ffffff");
        renderAll();
    });

    dom.elementStyleInput.addEventListener("change", () => {
        applyElementMutation((element) => {
            ensureElementStyle(element).additionalStyles = parseStyleText(dom?.elementStyleInput.value ?? "");
        });
    });

    const bindUtilityTextInput = (input: HTMLInputElement, cssKey: string) => {
        input.addEventListener("change", () => {
            applyElementMutation((element) => {
                setElementAdditionalStyle(element, cssKey, input.value.trim());
            });
        });
    };

    const bindUtilitySelectInput = (input: HTMLSelectElement, cssKey: string) => {
        input.addEventListener("change", () => {
            applyElementMutation((element) => {
                setElementAdditionalStyle(element, cssKey, input.value.trim());
            });
        });
    };

    bindUtilitySelectInput(dom.styleFontFamilyInput, "font-family");
    bindUtilityTextInput(dom.styleFontSizeInput, "font-size");
    bindUtilitySelectInput(dom.styleFontWeightInput, "font-weight");
    bindUtilitySelectInput(dom.styleBorderStyleInput, "border-style");
    bindUtilityTextInput(dom.styleBorderWidthInput, "border-width");
    bindUtilityTextInput(dom.styleBorderRadiusInput, "border-radius");
    bindUtilityTextInput(dom.stylePaddingInput, "padding");
    bindUtilityTextInput(dom.styleMarginInput, "margin");

    dom.styleBorderColorPickerInput.addEventListener("input", () => {
        const value = dom?.styleBorderColorPickerInput.value || "#111111";
        if (dom) {
            dom.styleBorderColorInput.value = value;
        }
        applyElementMutation((element) => {
            setElementAdditionalStyle(element, "border-color", value);
        }, false);
        renderAll();
    });

    dom.styleBorderColorInput.addEventListener("input", () => {
        const value = dom?.styleBorderColorInput.value.trim() || "#111111";
        applyElementMutation((element) => {
            setElementAdditionalStyle(element, "border-color", value);
        }, false);
        syncColorInput(dom?.styleBorderColorPickerInput, value, "#111111");
        renderAll();
    });

    dom.styleGradientStartInput.addEventListener("input", updateGradientPreview);
    dom.styleGradientEndInput.addEventListener("input", updateGradientPreview);
    dom.styleGradientAngleInput.addEventListener("input", updateGradientPreview);

    dom.styleApplyGradientBtn.addEventListener("click", () => {
        const start = dom?.styleGradientStartInput.value || "#4f9f8f";
        const end = dom?.styleGradientEndInput.value || "#f4d8b0";
        const angle = clampNumber(Number(dom?.styleGradientAngleInput.value), 0, 360);
        const gradient = `linear-gradient(${angle}deg, ${start}, ${end})`;
        if (dom) {
            dom.elementBgInput.value = gradient;
            syncColorInput(dom.elementBgColorPickerInput, gradient, "#ffffff");
        }
        applyElementMutation((element) => {
            ensureElementStyle(element).background = gradient;
        });
        updateGradientPreview();
    });

    dom.styleFlexCenterBtn.addEventListener("click", () => {
        applyElementMutation((element) => {
            setElementAdditionalStyle(element, "display", "flex");
            setElementAdditionalStyle(element, "align-items", "center");
            setElementAdditionalStyle(element, "justify-content", "center");
            setElementAdditionalStyle(element, "text-align", "center");
        });
    });

    dom.styleFlexRowBtn.addEventListener("click", () => {
        applyElementMutation((element) => {
            setElementAdditionalStyle(element, "display", "flex");
            setElementAdditionalStyle(element, "flex-direction", "row");
            setElementAdditionalStyle(element, "align-items", "center");
            setElementAdditionalStyle(element, "justify-content", "center");
            setElementAdditionalStyle(element, "gap", "4px");
        });
    });

    dom.styleTextLeftBtn.addEventListener("click", () => {
        applyElementMutation((element) => {
            setElementAdditionalStyle(element, "text-align", "left");
        });
    });

    dom.styleTextCenterBtn.addEventListener("click", () => {
        applyElementMutation((element) => {
            setElementAdditionalStyle(element, "text-align", "center");
        });
    });

    dom.styleClearUtilsBtn.addEventListener("click", () => {
        applyElementMutation((element) => {
            const style = ensureElementStyle(element);
            style.additionalStyles = {};
        });
    });

    dom.snapEnabledInput.addEventListener("change", () => {
        state.snapEnabled = dom?.snapEnabledInput.checked ?? true;
        renderAll();
    });

    dom.gridSizeInput.addEventListener("change", () => {
        state.gridSizeMm = clampNumber(Number(dom?.gridSizeInput.value), 0.5, 20);
        renderAll();
    });

    dom.undoBtn.addEventListener("click", undo);
    dom.redoBtn.addEventListener("click", redo);

    if (dom.addVariableBtn) {
        dom.addVariableBtn.addEventListener("click", () => {
        const variable = (dom?.newVariableInput!.value || "").trim();
        if (!variable) {
            return;
        }

        const active = getActiveTemplate();
        if (active.variables.includes(variable)) {
            setStatus("Variable already exists in this layout");
            return;
        }

        applyMutation(() => {
            // add to template variables
            const tmpl = getTemplateById(state.doc.activeTemplateId);
            tmpl.variables.push(variable);
            // add empty values for rows that use this template
            for (let i = 0; i < state.doc.sampleRows.length; i++) {
                if (state.doc.rowTemplateIds[i] === tmpl.id) {
                    const row = state.doc.sampleRows[i];
                    if (!row) continue;
                    row[variable] = "";
                }
            }
        });

        if (dom) {
            dom.newVariableInput!.value = "";
        }
        });
    }

    if (dom.deleteVariableBtn) {
        dom.deleteVariableBtn.addEventListener("click", () => {
        const variable = dom?.variableSelect?.value;
        if (!variable) {
            setStatus("No variable selected");
            return;
        }

        if (!confirm(`Delete variable '${variable}'?`)) {
            return;
        }

        applyMutation(() => {
            const tmpl = getTemplateById(state.doc.activeTemplateId);
            tmpl.variables = tmpl.variables.filter((name) => name !== variable);
            // remove from rows that use this template
            for (let i = 0; i < state.doc.sampleRows.length; i++) {
                if (state.doc.rowTemplateIds[i] === tmpl.id) {
                    const row = state.doc.sampleRows[i];
                    if (!row) continue;
                    delete row[variable];
                }
            }
        });
        });
    }

    dom.addRowBtn.addEventListener("click", async () => {
        // Use modal to collect template (display name), amount and variable values.
        const templates = state.doc.templates.map((t, index) => `${t.name} (#${index + 1})`);
        const templateOptionToId: Record<string, string> = {};
        const variableMap: Record<string, string[]> = {};
        state.doc.templates.forEach((t, index) => {
            const option = templates[index] || `${t.name} (#${index + 1})`;
            templateOptionToId[option] = t.id;
            variableMap[option] = t.variables ?? [];
        });
        const result = await openNewCardModal(templates, variableMap);
        if (!result) {
            setStatus("Card creation canceled", "muted");
            return;
        }

        const rawType = result["Card Type"] ?? "";
        const selectedOption = String(rawType);
        const templateId = templateOptionToId[selectedOption] ?? null;
        if (!templateId) {
            setStatus("Invalid template selected", "error");
            return;
        }

        const amountVal = Number(result["Amount of Cards"] ?? 1);
        const amount = Number.isFinite(amountVal) && amountVal > 0 ? Math.floor(amountVal) : 1;

        applyMutation(() => {
            const row: Record<string, string> = {};
            const tmpl = getTemplateById(templateId!);
            const templateOption = selectedOption;
            for (const variable of tmpl.variables) {
                const key = getCardVariableFieldLabel(templateOption, variable);
                const value = result[key] !== undefined ? String(result[key]) : "";
                row[variable] = value;
            }
            state.doc.sampleRows.push(row);
            state.doc.rowTemplateIds.push(templateId);
            state.doc.rowAmounts.push(amount);
            state.selectedRowIndex = state.doc.sampleRows.length - 1;
        });
    });

    dom.cardToolBtn.addEventListener("click", async () => {
        const templates = state.doc.templates.map((t, index) => `${t.name} (#${index + 1})`);
        const templateOptionToId: Record<string, string> = {};
        const variableMap: Record<string, string[]> = {};

        state.doc.templates.forEach((t, index) => {
            const option = templates[index] || `${t.name} (#${index + 1})`;
            templateOptionToId[option] = t.id;
            variableMap[option] = t.variables ?? [];
        });

        const result = await openCardToolModal(templates, variableMap);
        if (!result) {
            setStatus("Card tool canceled", "muted");
            return;
        }

        const selectedOption = String(result["Card Type"] ?? "");
        const templateId = templateOptionToId[selectedOption] ?? "";
        if (!templateId) {
            setStatus("Invalid template selected", "error");
            return;
        }

        const template = getTemplateById(templateId);

        const staticValues: Record<string, string> = {};
        for (const variable of template.variables) {
            const staticLabel = getCardToolStaticValueLabel(selectedOption, variable);
            staticValues[variable] = String(result[staticLabel] ?? "");
        }

        const differentLabel = getCardToolIncrementalVariableLabel(selectedOption);
        const differentParameter = String(result[differentLabel] ?? "None").trim();

        const targetVariable = differentParameter === "None" ? "" : differentParameter;
        if (targetVariable && !template.variables.includes(targetVariable)) {
            setStatus("Choose a valid varying variable for the selected template", "error");
            return;
        }

        const rawStart = Number(result["Start Value"]);
        const rawEnd = Number(result["End Value"]);
        const rawStep = Number(result["Step Value"]);

        const values: Array<string | null> = [];
        if (!targetVariable) {
            values.push(null);
        } else {
            if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd) || !Number.isFinite(rawStep)) {
                setStatus("Start, end and step must be numbers", "error");
                return;
            }

            const start = Math.trunc(rawStart);
            const end = Math.trunc(rawEnd);
            const step = Math.trunc(rawStep);

            if (step === 0) {
                setStatus("Step cannot be 0", "error");
                return;
            }

            if (step > 0) {
                for (let value = start; value <= end; value += step) {
                    values.push(String(value));
                    if (values.length > 100) {
                        break;
                    }
                }
            } else {
                for (let value = start; value >= end; value += step) {
                    values.push(String(value));
                    if (values.length > 100) {
                        break;
                    }
                }
            }

            if (values.length === 0) {
                setStatus("No cards generated. Check start/end/step direction", "error");
                return;
            }
        }

        if (values.length > 100) {
            setStatus("Card tool limit reached (max 100 cards)", "error");
            return;
        }

        applyMutation(() => {
            values.forEach((value) => {
                const row: Record<string, string> = {};
                for (const variable of template.variables) {
                    row[variable] = staticValues[variable] ?? "";
                }
                if (targetVariable && value !== null) {
                    row[targetVariable] = value;
                }
                state.doc.sampleRows.push(row);
                state.doc.rowTemplateIds.push(template.id);
                state.doc.rowAmounts.push(1);
            });
            state.selectedRowIndex = Math.max(0, state.doc.sampleRows.length - 1);
        });

        if (targetVariable) {
            setStatus(`Created ${values.length} cards with varying ${targetVariable}`);
        } else {
            setStatus(`Created ${values.length} cards with static values`);
        }
    });

    dom.removeRowBtn.addEventListener("click", () => {
        if (state.doc.sampleRows.length <= 1) {
            setStatus("At least one card is required");
            return;
        }

        applyMutation(() => {
            state.doc.sampleRows.splice(state.selectedRowIndex, 1);
            state.doc.rowTemplateIds.splice(state.selectedRowIndex, 1);
            state.doc.rowAmounts.splice(state.selectedRowIndex, 1);
            state.selectedRowIndex = Math.max(0, state.selectedRowIndex - 1);
        });
    });

    dom.mediaUploadInput.addEventListener("change", handleMediaUpload);
    initCustomContextMenu();
    updateGradientPreview();

    document.addEventListener("keydown", (event) => {
        if (isTypingTarget(event.target)) {
            return;
        }

        if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            dom?.deleteElementBtn.click();
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            const key = event.key.toLowerCase();
            if (key === "s") {
                event.preventDefault();
                saveDeck();
                return;
            }
            if (key === "z" && event.shiftKey) {
                event.preventDefault();
                redo();
                return;
            }
            if (key === "z") {
                event.preventDefault();
                undo();
                return;
            }
            if (key === "y") {
                event.preventDefault();
                redo();
                return;
            }
            if (key === "d") {
                event.preventDefault();
                dom?.duplicateElementBtn.click();
                return;
            }
            if (key === "c") {
                event.preventDefault();
                copySelectedElement();
                return;
            }
            if (key === "v") {
                event.preventDefault();
                pasteFromClipboard();
                return;
            }
        }

        if (!state.drag && state.selectedElementIndex !== null) {
            let dx = 0;
            let dy = 0;
            const step = state.snapEnabled ? state.gridSizeMm : 0.5;

            if (event.key === "ArrowLeft") {
                dx = -step;
            } else if (event.key === "ArrowRight") {
                dx = step;
            } else if (event.key === "ArrowUp") {
                dy = -step;
            } else if (event.key === "ArrowDown") {
                dy = step;
            }

            if (dx !== 0 || dy !== 0) {
                event.preventDefault();
                applyElementMutation((element) => {
                    element.posX = sanitizeCoordinate(element.posX + dx);
                    element.posY = sanitizeCoordinate(element.posY + dy);
                });
            }
        }
    });

    window.addEventListener("beforeunload", (event) => {
        flushAutosave();
        if (!state.dirty) {
            return;
        }
        event.preventDefault();
        event.returnValue = "";
    });
}

function createNewDeck() {
    if (state.dirty && !confirm("Discard unsaved changes?")) {
        return;
    }

    state.doc = createDefaultDocument();
    state.selectedElementIndex = 0;
    state.selectedRowIndex = 0;
    state.historyPast = [];
    state.historyFuture = [];
    state.dirty = false;
    saveTemporaryDesignerDocument();
    setStatus("Created new deck");
    renderAll();
}

function openSelectedDeck() {
    const fileToggle = dom?.headerMenuToggles.find((button) => button.dataset.menuToggle === "file") ?? null;
    openSavedDeckModal(fileToggle);
}

function initHeaderMenus() {
    if (!dom) {
        return;
    }

    const clearHeaderMenuCloseTimer = () => {
        if (headerMenuCloseTimer !== null) {
            window.clearTimeout(headerMenuCloseTimer);
            headerMenuCloseTimer = null;
        }
    };

    const scheduleHeaderMenuClose = (menu: HeaderMenuKind) => {
        clearHeaderMenuCloseTimer();
        headerMenuCloseTimer = window.setTimeout(() => {
            if (activeHeaderMenu === menu) {
                closeHeaderMenus();
            }
        }, 140);
    };

    dom.headerMenus.forEach((container) => {
        const menu = container.dataset.headerMenu as HeaderMenuKind | undefined;
        if (!menu) {
            return;
        }

        container.addEventListener("mouseenter", () => {
            clearHeaderMenuCloseTimer();
            openHeaderMenu(menu);
        });

        container.addEventListener("mouseleave", () => {
            if (activeHeaderMenu === menu) {
                scheduleHeaderMenuClose(menu);
            }
        });

        const panel = container.querySelector("[data-menu-panel]") as HTMLElement | null;
        if (panel) {
            panel.addEventListener("mouseenter", clearHeaderMenuCloseTimer);
            panel.addEventListener("mouseleave", () => {
                if (activeHeaderMenu === menu) {
                    scheduleHeaderMenuClose(menu);
                }
            });
        }
    });

    dom.headerMenuToggles.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const menu = button.dataset.menuToggle as HeaderMenuKind | undefined;
            if (!menu) {
                return;
            }
            if (activeHeaderMenu === menu) {
                closeHeaderMenus();
                return;
            }
            openHeaderMenu(menu);
        });
    });

    dom.headerMenuItems.forEach((button) => {
        button.addEventListener("click", () => {
            const menu = button.dataset.menu as HeaderMenuKind | undefined;
            const action = button.dataset.action;
            if (!menu || !action) {
                return;
            }
            closeHeaderMenus();
            runHeaderMenuAction(menu, action);
        });
    });

    document.addEventListener("click", (event) => {
        if (!dom) {
            return;
        }
        const target = event.target;
        if (!(target instanceof Node)) {
            return;
        }
        if (dom.headerMenus.some((menu) => menu.contains(target))) {
            return;
        }
        clearHeaderMenuCloseTimer();
        closeHeaderMenus();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && activeHeaderMenu) {
            clearHeaderMenuCloseTimer();
            closeHeaderMenus();
        }
    });
}

function openHeaderMenu(menu: HeaderMenuKind) {
    if (!dom) {
        return;
    }

    activeHeaderMenu = menu;
    dom.headerMenus.forEach((container) => {
        const kind = container.dataset.headerMenu as HeaderMenuKind | undefined;
        const isOpen = kind === menu;
        container.classList.toggle("is-open", isOpen);

        const panel = container.querySelector("[data-menu-panel]") as HTMLElement | null;
        if (panel) {
            panel.hidden = !isOpen;
        }

        const toggle = container.querySelector("[data-menu-toggle]") as HTMLButtonElement | null;
        if (toggle) {
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        }
    });
}

function closeHeaderMenus() {
    if (!dom) {
        return;
    }

    if (headerMenuCloseTimer !== null) {
        window.clearTimeout(headerMenuCloseTimer);
        headerMenuCloseTimer = null;
    }

    activeHeaderMenu = null;
    dom.headerMenus.forEach((container) => {
        container.classList.remove("is-open");

        const panel = container.querySelector("[data-menu-panel]") as HTMLElement | null;
        if (panel) {
            panel.hidden = true;
        }

        const toggle = container.querySelector("[data-menu-toggle]") as HTMLButtonElement | null;
        if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
        }
    });
}

async function runHeaderMenuAction(menu: HeaderMenuKind, action: string) {
    if (menu === "file") {
        if (action === "new") {
            createNewDeck();
        } else if (action === "save") {
            saveDeck();
        } else if (action === "settings") {
            const active = getActiveTemplate();
            const settingResult = await openSettingsModal({
                deckName: state.doc.deckName,
                backColor: active?.spec.back?.background ?? undefined,
                width: active?.spec.width,
                height: active?.spec.height
            });
            if (settingResult) {
                applyMutation(() => {
                    // Modal returns a map with labels as keys (Modal.show uses field.label as key)
                    if (settingResult["Deck Name"] !== undefined) {
                        state.doc.deckName = String(settingResult["Deck Name"] || state.doc.deckName);
                    }
                    const widthVal = settingResult["Card Width (mm)"];
                    const heightVal = settingResult["Card Height (mm)"];
                    if (Number.isFinite(Number(widthVal))) {
                        const w = Number(widthVal);
                        for (const t of state.doc.templates) {
                            t.spec.width = w;
                        }
                    }
                    if (Number.isFinite(Number(heightVal))) {
                        const h = Number(heightVal);
                        for (const t of state.doc.templates) {
                            t.spec.height = h;
                        }
                    }
                    if (settingResult["Card Back Color"] !== undefined) {
                        const back = String(settingResult["Card Back Color"] || "");
                        for (const t of state.doc.templates) {
                            t.spec.back.background = back;
                        }
                    }
                });
                setStatus("Settings updated");
            }
        } else if (action === "open") {
            openSelectedDeck();
        } else if (action === "import") {
            dom?.importJsonFile.click();
        } else if (action === "export") {
            exportDeckAsJson();
        } else if (action === "print") {
            printDeckSheet();
        }
        return;
    }

    if (menu === "edit") {
        if (action === "undo") {
            undo();
        } else if (action === "redo") {
            redo();
        } else if (action === "copy-element") {
            copySelectedElement();
        } else if (action === "paste-element") {
            pasteElementFromClipboard();
        } else if (action === "copy-template") {
            copyActiveTemplate();
        } else if (action === "paste-template") {
            pasteTemplateFromClipboard();
        } else if (action === "duplicate-element") {
            dom?.duplicateElementBtn.click();
        } else if (action === "delete-element") {
            dom?.deleteElementBtn.click();
        }
        return;
    }

    if (action === "single" || action === "deck") {
        state.viewMode = action;
        renderAll();
    }
}

function copySelectedElement() {
    const element = getSelectedElement();
    if (!element) {
        setStatus("Select an element first", "error");
        return;
    }

    state.clipboard = {
        kind: "element",
        element: clone(element)
    };
    setStatus("Element copied");
}

function pasteElementFromClipboard() {
    if (!state.clipboard || state.clipboard.kind !== "element") {
        setStatus("Clipboard has no copied element", "error");
        return;
    }

    const source = clone(state.clipboard.element);
    applyMutation(() => {
        source.id = crypto.randomUUID();
        const layout = getActiveTemplate().spec.layout;
        layout.push(source);
        state.selectedElementIndex = layout.length - 1;
    });

    setStatus("Element pasted");
}

function copyActiveTemplate() {
    state.clipboard = {
        kind: "template",
        template: clone(getActiveTemplate())
    };
    setStatus("Template copied");
}

function pasteTemplateFromClipboard() {
    if (!state.clipboard || state.clipboard.kind !== "template") {
        setStatus("Clipboard has no copied template", "error");
        return;
    }

    const templateCopy = clone(state.clipboard.template);
    applyMutation(() => {
        templateCopy.id = crypto.randomUUID();
        templateCopy.name = `${templateCopy.name} Copy`;
        templateCopy.spec.uuid = crypto.randomUUID();
        templateCopy.spec.layout = templateCopy.spec.layout.map((element) => ({
            ...element,
            id: crypto.randomUUID()
        }));
        state.doc.templates.push(templateCopy);
        state.doc.activeTemplateId = templateCopy.id;
        state.selectedElementIndex = templateCopy.spec.layout.length > 0 ? 0 : null;
    });

    setStatus("Template pasted");
}

function pasteFromClipboard() {
    if (!state.clipboard) {
        setStatus("Clipboard is empty", "error");
        return;
    }

    if (state.clipboard.kind === "element") {
        pasteElementFromClipboard();
        return;
    }

    pasteTemplateFromClipboard();
}

async function askTextValue(params: {
    title: string;
    message: string;
    label: string;
    defaultValue: string;
    confirmLabel: string;
}): Promise<string | null> {
    if (!dom) {
        return null;
    }

    dom.dialogTitle.textContent = params.title;
    dom.dialogMessage.textContent = params.message;
    dom.dialogTextLabel.textContent = params.label;
    dom.dialogTextInput.value = params.defaultValue;
    dom.dialogConfirmBtn.textContent = params.confirmLabel;
    dom.dialogTextField.style.display = "flex";
    dom.dialogSelectField.style.display = "none";
    return showDialogValue("text");
}

function showDialogValue(mode: "text" | "select"): Promise<string | null> {
    if (!dom) {
        return Promise.resolve(null);
    }

    const ui = dom;
    return new Promise((resolve) => {
        let done = false;
        const close = (value: string | null) => {
            if (done) {
                return;
            }
            done = true;
            ui.dialog.close();
            ui.dialogConfirmBtn.removeEventListener("click", onConfirm);
            ui.dialogCancelBtn.removeEventListener("click", onCancel);
            ui.dialog.removeEventListener("cancel", onCancel);
            resolve(value);
        };

        const onConfirm = () => {
            if (mode === "text") {
                close(ui.dialogTextInput.value.trim() || null);
                return;
            }
            close(ui.dialogSelectInput.value || null);
        };

        const onCancel = () => close(null);

        ui.dialogConfirmBtn.addEventListener("click", onConfirm);
        ui.dialogCancelBtn.addEventListener("click", onCancel);
        ui.dialog.addEventListener("cancel", onCancel, { once: true });
        ui.dialog.showModal();
        if (mode === "text") {
            ui.dialogTextInput.focus();
            ui.dialogTextInput.select();
        } else {
            ui.dialogSelectInput.focus();
        }
    });
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function updateGradientPreview() {}

function parseSimpleLinearGradient(value: string): { angle: number; start: string; end: string } | null {
    const match = value.trim().match(/^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)\s*,\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)\s*\)$/i);
    if (!match) {
        return null;
    }

    return {
        angle: clampNumber(Number(match[1]), 0, 360),
        start: match[2] || "#4f9f8f",
        end: match[3] || "#f4d8b0"
    };
}

function syncGradientInputsFromBackground(background: string) {
    if (!dom) {
        return;
    }

    const parsed = parseSimpleLinearGradient(background);
    if (!parsed) {
        updateGradientPreview();
        return;
    }

    syncColorInput(dom.styleGradientStartInput, parsed.start, dom.styleGradientStartInput.value || "#4f9f8f");
    syncColorInput(dom.styleGradientEndInput, parsed.end, dom.styleGradientEndInput.value || "#f4d8b0");
    dom.styleGradientAngleInput.value = String(roundTo(parsed.angle, 0));
    updateGradientPreview();
}

function initCustomContextMenu() {
    if (!dom?.contextMenu) {
        return;
    }

    dom.contextMenuItems.forEach((item) => {
        item.addEventListener("click", () => {
            const action = item.dataset.contextAction;
            hideCustomContextMenu();
            if (!action) {
                return;
            }
            runCustomContextAction(action);
        });
    });

    document.addEventListener("click", (event) => {
        if (!dom?.contextMenu || dom.contextMenu.hidden) {
            return;
        }

        const target = event.target;
        if (target instanceof Node && dom.contextMenu.contains(target)) {
            return;
        }

        hideCustomContextMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            hideCustomContextMenu();
        }
    });

    window.addEventListener("resize", hideCustomContextMenu);
    window.addEventListener("scroll", hideCustomContextMenu, true);
}

function runCustomContextAction(action: string) {
    if (action === "add-text") {
        dom?.addTextBtn.click();
    } else if (action === "add-image") {
        dom?.addImageBtn.click();
    } else if (action === "paste") {
        pasteFromClipboard();
    } else if (action === "copy") {
        copySelectedElement();
    } else if (action === "duplicate") {
        dom?.duplicateElementBtn.click();
    } else if (action === "delete") {
        dom?.deleteElementBtn.click();
    } else if (action === "layer-front") {
        moveLayer("front");
    } else if (action === "layer-back") {
        moveLayer("back");
    }
}

function openCustomContextMenu(clientX: number, clientY: number) {
    if (!dom?.contextMenu) {
        return;
    }

    const hasElement = Boolean(getSelectedElement());
    dom.contextMenuItems.forEach((item) => {
        const requiresElement = item.dataset.requiresElement === "true";
        item.disabled = requiresElement && !hasElement;
    });

    const menu = dom.contextMenu;
    menu.hidden = false;
    menu.style.visibility = "hidden";
    menu.style.left = "0px";
    menu.style.top = "0px";

    const rect = menu.getBoundingClientRect();
    const padding = 8;
    const left = Math.max(padding, Math.min(clientX, window.innerWidth - rect.width - padding));
    const top = Math.max(padding, Math.min(clientY, window.innerHeight - rect.height - padding));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";
}

function hideCustomContextMenu() {
    if (!dom?.contextMenu || dom.contextMenu.hidden) {
        return;
    }

    dom.contextMenu.hidden = true;
}

function setSidebarTab(tab: string) {
    if (!dom) {
        return;
    }

    for (const button of dom.tabButtons) {
        button.classList.toggle("active", button.dataset.sidebarTab === tab);
    }

    for (const content of dom.tabContents) {
        content.classList.toggle("active", content.dataset.sidebarContent === tab);
    }
}

async function askTemplateId(): Promise<string | null> {
    if (!dom) {
        return null;
    }

    const templates = state.doc.templates;
    dom.dialogTitle.textContent = "Select Template";
    dom.dialogMessage.textContent = "Choose a template for the new row.";
    dom.dialogSelectLabel.textContent = "Template";
    dom.dialogConfirmBtn.textContent = "Use Template";
    dom.dialogTextField.style.display = "none";
    dom.dialogSelectField.style.display = "flex";
    dom.dialogSelectInput.replaceChildren();

    templates.forEach((template, index) => {
        const option = document.createElement("option");
        option.value = template.id;
        option.textContent = `${index + 1}. ${template.name}`;
        dom?.dialogSelectInput.appendChild(option);
    });

    dom.dialogSelectInput.value = state.doc.activeTemplateId;
    return showDialogValue("select");
}

function getActiveTemplate(): EditorTemplate {
    const found = state.doc.templates.find((template) => template.id === state.doc.activeTemplateId);
    if (found) {
        return found;
    }

    const fallback = state.doc.templates[0];
    if (!fallback) {
        const created = createDefaultTemplate();
        state.doc.templates = [created];
        state.doc.activeTemplateId = created.id;
        return created;
    }

    state.doc.activeTemplateId = fallback.id;
    return fallback;
}

function getTemplateById(templateId: string): EditorTemplate {
    return state.doc.templates.find((template) => template.id === templateId) ?? getActiveTemplate();
}

function getSelectedElement(): EditorLayoutElement | null {
    if (state.selectedElementIndex === null) {
        return null;
    }

    return getActiveTemplate().spec.layout[state.selectedElementIndex] ?? null;
}

function ensureElementStyle(element: EditorLayoutElement): EditorCardStyle {
    if (!element.style) {
        element.style = createDefaultStyle();
    }

    if (!element.style.additionalStyles) {
        element.style.additionalStyles = {};
    }

    return element.style;
}

function getMediaAsset(mediaId?: string): MediaAsset | null {
    if (!mediaId) {
        return null;
    }
    return state.doc.mediaLibrary[mediaId] ?? null;
}

function resolveBackground(style: EditorCardStyle): string {
    const media = getMediaAsset(style.backgroundMediaId);
    if (media) {
        return `url(${media.dataUrl})`;
    }
    return style.background;
}

function resolveImageContent(element: EditorLayoutElement): string {
    const media = getMediaAsset(element.contentMediaId);
    if (media) {
        return media.dataUrl;
    }
    return element.content;
}

function toCardSpecification(template: EditorTemplate, cardIndex: number): CardSpecification {
    const spec = template.spec;
    return {
        uuid: `${state.doc.deckUuid}-${cardIndex + 1}`,
        width: spec.width,
        height: spec.height,
        front: {
            ...spec.front,
            background: resolveBackground(spec.front)
        },
        back: {
            ...spec.back,
            background: resolveBackground(spec.back)
        },
        layout: spec.layout.map((element) => ({
            type: element.type,
            content: element.type === "image" ? resolveImageContent(element) : element.content,
            posX: element.posX,
            posY: element.posY,
            width: element.width,
            height: element.height,
            centered: element.centered,
            style: element.style
                ? {
                    ...element.style,
                    background: resolveBackground(element.style)
                }
                : undefined
        }))
    };
}

function normalizeRowAmount(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 1;
    }
    return clampNumber(Math.round(numeric), 1, 999);
}

function getRowAmount(rowIndex: number): number {
    return normalizeRowAmount(state.doc.rowAmounts[rowIndex]);
}

function getDeckRowInstances(): DeckRowInstance[] {
    const rows: DeckRowInstance[] = [];
    let cardIndex = 0;

    state.doc.sampleRows.forEach((row, rowIndex) => {
        const templateId = state.doc.rowTemplateIds[rowIndex] || state.doc.activeTemplateId;
        const template = getTemplateById(templateId);
        const amount = getRowAmount(rowIndex);

        for (let copyIndex = 0; copyIndex < amount; copyIndex += 1) {
            rows.push({
                row,
                rowIndex,
                copyIndex,
                cardIndex,
                template
            });
            cardIndex += 1;
        }
    });

    return rows;
}

function sanitizeDocument(document: EditorDocument) {
    if (document.sampleRows.length === 0) {
        document.sampleRows.push({});
    }

    while (document.rowTemplateIds.length < document.sampleRows.length) {
        document.rowTemplateIds.push(document.activeTemplateId);
    }
    if (document.rowTemplateIds.length > document.sampleRows.length) {
        document.rowTemplateIds = document.rowTemplateIds.slice(0, document.sampleRows.length);
    }

    if (!Array.isArray(document.rowAmounts)) {
        document.rowAmounts = [];
    }
    while (document.rowAmounts.length < document.sampleRows.length) {
        document.rowAmounts.push(1);
    }
    if (document.rowAmounts.length > document.sampleRows.length) {
        document.rowAmounts = document.rowAmounts.slice(0, document.sampleRows.length);
    }
    document.rowAmounts = document.rowAmounts.map((amount) => normalizeRowAmount(amount));

    const templateIds = new Set(document.templates.map((template) => template.id));
    document.rowTemplateIds = document.rowTemplateIds.map((templateId) => (templateIds.has(templateId) ? templateId : document.activeTemplateId));

    for (let i = 0; i < document.sampleRows.length; i++) {
        const row = document.sampleRows[i];
        if (!row) continue;
        const templateId = document.rowTemplateIds[i] ?? document.activeTemplateId;
        const tmpl = document.templates.find((t) => t.id === templateId);
        const vars = tmpl?.variables ?? [];
        for (const variable of vars) {
            if (!(variable in row)) {
                row[variable] = "";
            }
        }
    }
}

function parseImportedDocument(raw: unknown): EditorDocument {
    const parsed = raw as Partial<EditorDocument> & {
        template?: CardSpecification;
        sampleRows?: Record<string, string>[];
    };

    if (parsed.version === 2 && Array.isArray(parsed.templates) && Array.isArray(parsed.sampleRows)) {
        const document = clone(parsed as EditorDocument);
        // Ensure templates have variables arrays
        document.templates.forEach((t) => {
            if (!Array.isArray((t as any).variables)) {
                (t as any).variables = [];
            }
        });
        sanitizeDocument(document);
        return document;
    }

    if (parsed.template && Array.isArray(parsed.sampleRows)) {
        const template: EditorTemplate = {
            id: crypto.randomUUID(),
            name: "Layout 1",
            spec: {
                ...clone(parsed.template),
                layout: parsed.template.layout.map((element) => ({
                    ...clone(element),
                    id: crypto.randomUUID()
                }))
            }
            ,
            variables: []
        };

        const variableSet = new Set<string>();
        for (const row of parsed.sampleRows) {
            Object.keys(row).forEach((key) => variableSet.add(key));
        }

        // attach discovered variables to the template
        template.variables = Array.from(variableSet);

        const document: EditorDocument = {
            version: 2,
            deckName: parsed.deckName || "Imported Deck",
            deckUuid: parsed.deckUuid || crypto.randomUUID(),
            templates: [template],
            activeTemplateId: template.id,
            rowTemplateIds: parsed.sampleRows.map(() => template.id),
            rowAmounts: parsed.sampleRows.map(() => 1),
            sampleRows: clone(parsed.sampleRows),
            mediaLibrary: {}
        };
        sanitizeDocument(document);
        return document;
    }

    throw new Error("Invalid deck schema");
}

function snapshotDocument(): string {
    return JSON.stringify(state.doc);
}

function pushHistory(snapshot: string) {
    state.historyPast.push(snapshot);
    if (state.historyPast.length > HISTORY_LIMIT) {
        state.historyPast.shift();
    }
    state.historyFuture = [];
}

function applyMutation(mutator: () => void, useHistory = true) {
    const before = snapshotDocument();
    mutator();
    sanitizeDocument(state.doc);
    const after = snapshotDocument();

    if (before !== after) {
        state.dirty = true;
        if (useHistory) {
            pushHistory(before);
        }
        scheduleAutosave();
    }

    renderAll();
}

function applyElementMutation(mutator: (element: EditorLayoutElement) => void, useHistory = true) {
    const element = getSelectedElement();
    if (!element) {
        return;
    }
    applyMutation(() => mutator(element), useHistory);
}

function undo() {
    const previous = state.historyPast.pop();
    if (!previous) {
        setStatus("Nothing to undo");
        return;
    }

    state.historyFuture.push(snapshotDocument());
    state.doc = JSON.parse(previous) as EditorDocument;
    sanitizeDocument(state.doc);
    state.selectedElementIndex = clampNumber(state.selectedElementIndex ?? 0, 0, Math.max(0, getActiveTemplate().spec.layout.length - 1));
    state.selectedRowIndex = clampNumber(state.selectedRowIndex, 0, Math.max(0, state.doc.sampleRows.length - 1));
    state.dirty = true;
    scheduleAutosave();
    setStatus("Undo");
    renderAll();
}

function redo() {
    const next = state.historyFuture.pop();
    if (!next) {
        setStatus("Nothing to redo");
        return;
    }

    state.historyPast.push(snapshotDocument());
    state.doc = JSON.parse(next) as EditorDocument;
    sanitizeDocument(state.doc);
    state.selectedElementIndex = clampNumber(state.selectedElementIndex ?? 0, 0, Math.max(0, getActiveTemplate().spec.layout.length - 1));
    state.selectedRowIndex = clampNumber(state.selectedRowIndex, 0, Math.max(0, state.doc.sampleRows.length - 1));
    state.dirty = true;
    scheduleAutosave();
    setStatus("Redo");
    renderAll();
}

function moveLayer(direction: "front" | "forward" | "backward" | "back") {
    const index = state.selectedElementIndex;
    if (index === null) {
        return;
    }

    applyMutation(() => {
        const list = getActiveTemplate().spec.layout;
        const element = list[index];
        if (!element) {
            return;
        }

        list.splice(index, 1);

        let targetIndex = index;
        if (direction === "front") {
            targetIndex = list.length;
        } else if (direction === "forward") {
            targetIndex = Math.min(index + 1, list.length);
        } else if (direction === "backward") {
            targetIndex = Math.max(index - 1, 0);
        } else {
            targetIndex = 0;
        }

        list.splice(targetIndex, 0, element);
        state.selectedElementIndex = targetIndex;
    });
}

async function handleMediaUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
        return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const mediaId = getOrCreateMediaAsset(file, dataUrl);

    applyMutation(() => {
        if (state.pendingUploadTarget === "front-bg") {
            getActiveTemplate().spec.front.backgroundMediaId = mediaId;
        } else if (state.pendingUploadTarget === "element-image") {
            const element = getSelectedElement();
            if (element) {
                element.type = "image";
                element.contentMediaId = mediaId;
            }
        }
    });

    state.pendingUploadTarget = null;
    input.value = "";
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("File read failed"));
        reader.readAsDataURL(file);
    });
}

function getOrCreateMediaAsset(file: File, dataUrl: string): string {
    for (const existing of Object.values(state.doc.mediaLibrary)) {
        if (existing.dataUrl === dataUrl) {
            setStatus(`Reused media asset: ${existing.name}`);
            return existing.id;
        }
    }

    const asset: MediaAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl
    };

    state.doc.mediaLibrary[asset.id] = asset;
    setStatus(`Uploaded media: ${asset.name}`);
    return asset.id;
}

function saveTemporaryDesignerDocument() {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.setItem(DESIGNER_DRAFT_KEY, JSON.stringify(state.doc));
}

function flushAutosave() {
    if (autosaveTimer !== null) {
        window.clearTimeout(autosaveTimer);
        autosaveTimer = null;
    }
    saveTemporaryDesignerDocument();
}

function scheduleAutosave() {
    if (autosaveTimer !== null) {
        window.clearTimeout(autosaveTimer);
    }
    autosaveTimer = window.setTimeout(() => {
        autosaveTimer = null;
        saveTemporaryDesignerDocument();
    }, AUTOSAVE_DELAY_MS);
}

function restoreTemporaryDesignerDocument() {
    if (typeof localStorage === "undefined") {
        return;
    }

    const raw = localStorage.getItem(DESIGNER_DRAFT_KEY);
    if (!raw) {
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        state.doc = parseImportedDocument(parsed);
        state.selectedElementIndex = getActiveTemplate().spec.layout.length > 0 ? 0 : null;
        state.selectedRowIndex = 0;
        state.historyPast = [];
        state.historyFuture = [];
        state.dirty = true;
        setStatus("Restored autosave draft", "muted");
    } catch {
        localStorage.removeItem(DESIGNER_DRAFT_KEY);
    }
}

function deleteSavedDeck(uuid: string) {
    if (typeof localStorage === "undefined") {
        return;
    }

    localStorage.removeItem(`${DESIGNER_PREFIX}:${uuid}`);
    localStorage.removeItem(`${CARD_DECK_PREFIX}:${uuid}`);
}

function saveDeck() {
    saveDesignerDocument();

    const cardDeck = new CardDeck(state.doc.deckName, state.doc.deckUuid);
    getDeckRowInstances().forEach((instance) => {
        cardDeck.addCard(new Card(toCardSpecification(instance.template, instance.cardIndex), clone(instance.row)));
    });
    cardDeck.toLocalStorage();

    state.dirty = false;
    saveTemporaryDesignerDocument();
    setStatus("Saved designer document and generated card deck");
    if (dom?.savedDecksModal.open) {
        renderSavedDeckCards();
    }
    renderToolbarState();
}

function saveDesignerDocument() {
    if (typeof localStorage === "undefined") {
        throw new Error("localStorage is not available");
    }

    const key = `${DESIGNER_PREFIX}:${state.doc.deckUuid}`;
    localStorage.setItem(key, JSON.stringify(state.doc));
}

function loadDesignerDocument(uuid: string) {
    try {
        const key = `${DESIGNER_PREFIX}:${uuid}`;
        const raw = localStorage.getItem(key);
        if (!raw) {
            throw new Error("Saved designer deck not found");
        }

        state.doc = parseImportedDocument(JSON.parse(raw));
        state.selectedElementIndex = getActiveTemplate().spec.layout.length > 0 ? 0 : null;
        state.selectedRowIndex = 0;
        state.historyPast = [];
        state.historyFuture = [];
        state.dirty = false;
        saveTemporaryDesignerDocument();
        setStatus("Designer deck loaded");
        renderAll();
    } catch (error) {
        setStatus(`Load failed: ${(error as Error).message}`);
    }
}

function getSavedDesignerDecks(): Array<{ uuid: string; name: string }> {
    if (typeof localStorage === "undefined") {
        return [];
    }

    const items: Array<{ uuid: string; name: string }> = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`${DESIGNER_PREFIX}:`)) {
            continue;
        }

        const uuid = key.slice(DESIGNER_PREFIX.length + 1);
        const raw = localStorage.getItem(key);
        if (!raw) {
            continue;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<EditorDocument>;
            items.push({
                uuid,
                name: parsed.deckName || uuid
            });
        } catch {
            items.push({ uuid, name: uuid });
        }
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
}

function exportDeckAsJson() {
    const payload = clone(state.doc);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.doc.deckName.replace(/\s+/g, "-").toLowerCase() || "deck"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus("JSON exported");
}

function importDeckFromFile(event: Event) {
    if (!dom) {
        return;
    }

    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(String(reader.result || ""));
            state.doc = parseImportedDocument(parsed);
            state.selectedElementIndex = getActiveTemplate().spec.layout.length > 0 ? 0 : null;
            state.selectedRowIndex = 0;
            state.historyPast = [];
            state.historyFuture = [];
            state.dirty = true;
            saveTemporaryDesignerDocument();
            setStatus("JSON imported");
            renderAll();
        } catch (error) {
            setStatus(`Import failed: ${(error as Error).message}`);
        }

        target.value = "";
    };

    reader.readAsText(file);
}

function printDeckSheet() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        setStatus("Print popup blocked");
        return;
    }

    const cardsHtml = getDeckRowInstances()
        .map((instance) => {
            const card = new Card(toCardSpecification(instance.template, instance.cardIndex), instance.row).getRender();
            return card.outerHTML;
        })
        .join("\n");

    printWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Print ${state.doc.deckName}</title>
<style>
@page { size: A4 portrait; margin: 5mm; }
body {
    margin: 0;
    font-family: Roboto, sans-serif;
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
.sheet {
    display: grid;
    align-items: center;
    grid-template-columns: repeat(auto-fill, minmax(63.5mm, 1fr));
    gap: 0;
}
.card {
    break-inside: avoid;
    page-break-inside: avoid;
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    box-shadow: none !important;
    border: 0.25mm solid black;
    border-radius: 0;
    margin: 0;
}
.card-layout-element,
.card-layout-element img {
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
</style>
</head>
<body>
<div class="sheet">${cardsHtml}</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`);
    printWindow.document.close();
    setStatus("Print preview opened");
}

function renderAll() {
    const focus = captureFocus();
    renderToolbarState();
    renderTemplateSelect();
    renderVariableSelect();
    renderMediaSelects();
    renderPropertiesPanel();
    renderDataTable();
    renderCanvas();
    restoreFocus(focus);
}

function captureFocus(): FocusSnapshot | null {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
        return null;
    }

    const key = getFocusKey(active);
    if (!key) {
        return null;
    }

    let selectionStart: number | null = null;
    let selectionEnd: number | null = null;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        selectionStart = active.selectionStart;
        selectionEnd = active.selectionEnd;
    }

    return {
        key,
        selectionStart,
        selectionEnd
    };
}

function restoreFocus(snapshot: FocusSnapshot | null) {
    if (!snapshot) {
        return;
    }

    const target = document.querySelector(`[data-focus-key="${snapshot.key.replace(/"/g, "\\\"")}"]`) as HTMLElement | null;
    if (!target) {
        return;
    }

    target.focus();
    if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && snapshot.selectionStart !== null && snapshot.selectionEnd !== null) {
        target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    }
}

function getFocusKey(element: HTMLElement): string | null {
    if (element.dataset.focusKey) {
        return element.dataset.focusKey;
    }
    if (element.id) {
        return `id:${element.id}`;
    }
    return null;
}

function renderToolbarState() {
    if (!dom) {
        return;
    }

    for (const button of dom.viewButtons) {
        button.classList.toggle("active", button.dataset.viewMode === state.viewMode);
    }

    const activeTemplate = getActiveTemplate();
    // update header fields to reflect current document/template settings
    if (dom.headerDeckName) {
        dom.headerDeckName.textContent = state.doc.deckName;
    }
    if (dom.headerCardSize) {
        dom.headerCardSize.textContent = `${roundTo(activeTemplate.spec.width, 2)} × ${roundTo(activeTemplate.spec.height, 2)} mm`;
    }
    dom.snapEnabledInput.checked = state.snapEnabled;
    dom.gridSizeInput.value = String(state.gridSizeMm);
    dom.statusLabel.textContent = state.dirty ? "Unsaved changes" : "Saved";
}

function renderSavedDeckCards() {
    if (!dom) {
        return;
    }
    const ui = dom;

    const items = getSavedDesignerDecks();
    const draftItems = items.filter((item) => item.uuid === "draft");
    const savedItems = items.filter((item) => item.uuid !== "draft");
    ui.savedDecksGrid.replaceChildren();

    if (draftItems.length === 0 && savedItems.length === 0) {
        const empty = document.createElement("p");
        empty.className = "saved-decks-empty";
        empty.textContent = "No saved decks yet. Save the current deck to make it appear here.";
        ui.savedDecksGrid.appendChild(empty);
        return;
    }

    const renderDeckSection = (title: string, entries: Array<{ uuid: string; name: string }>) => {
        if (entries.length === 0) {
            return;
        }

        const section = document.createElement("section");
        section.className = "saved-decks-section";

        const heading = document.createElement("h4");
        heading.className = "saved-decks-section-title";
        heading.textContent = title;
        section.appendChild(heading);

        const sectionGrid = document.createElement("div");
        sectionGrid.className = "saved-decks-section-grid";

        for (const item of entries) {
        const card = document.createElement("div");
        card.className = "saved-deck-card";
        card.title = item.name;

        const name = document.createElement("span");
        name.className = "saved-deck-card-name";
        name.textContent = item.name;

        const id = document.createElement("span");
        id.className = "saved-deck-card-id";
        id.textContent = item.uuid === "draft" ? "Temporary draft" : `UUID ${item.uuid.slice(0, 8)}...`;

        const actions = document.createElement("div");
        actions.className = "saved-deck-card-actions";

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "btn btn-primary saved-deck-open-btn";
        openButton.textContent = "Open";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-error saved-deck-delete-btn";
        deleteButton.textContent = "Delete";

        card.appendChild(name);
        card.appendChild(id);
        actions.appendChild(openButton);
        actions.appendChild(deleteButton);
        card.appendChild(actions);

        openButton.addEventListener("click", () => {
            loadDesignerDocument(item.uuid);
            closeSavedDeckModal();
        });

        deleteButton.addEventListener("click", () => {
            deleteSavedDeck(item.uuid);
            if (state.doc.deckUuid === item.uuid) {
                createNewDeck();
            }
            setStatus(`Deleted deck ${item.name}`);
            renderSavedDeckCards();
        });

        sectionGrid.appendChild(card);
        }

        section.appendChild(sectionGrid);
        ui.savedDecksGrid.appendChild(section);
    };

    renderDeckSection("Drafts", draftItems);
    renderDeckSection("Saved Decks", savedItems);
}

function renderTemplateSelect() {
    if (!dom) {
        return;
    }

    const templateSelect = dom.templateSelect;
    templateSelect.replaceChildren();
    state.doc.templates.forEach((template, index) => {
        const option = document.createElement("option");
        option.value = template.id;
        option.textContent = `${index + 1}. ${template.name}`;
        templateSelect.appendChild(option);
    });

    templateSelect.value = state.doc.activeTemplateId;
}

function renderVariableSelect() {
    if (!dom) {
        return;
    }
    const variableSelect = dom.variableSelect;
    if (!variableSelect) return;

    const previous = variableSelect.value;
    variableSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    const active = getActiveTemplate();
    placeholder.textContent = (active.variables && active.variables.length > 0) ? "Select variable" : "No variables";
    variableSelect.appendChild(placeholder);

    (active.variables || []).forEach((variable) => {
        const option = document.createElement("option");
        option.value = variable;
        option.textContent = variable;
        variableSelect.appendChild(option);
    });

    if ((active.variables || []).includes(previous)) {
        variableSelect.value = previous;
    }
}

function renderMediaSelects() {
    if (!dom) {
        return;
    }

    const mediaItems = Object.values(state.doc.mediaLibrary);
    const element = getSelectedElement();
    renderMediaSelect(dom.elementMediaSelect, mediaItems, "No image media", element?.contentMediaId);
}

function renderMediaSelect(select: HTMLSelectElement, mediaItems: MediaAsset[], emptyLabel: string, selectedId?: string) {
    select.replaceChildren();

    const none = document.createElement("option");
    none.value = "";
    none.textContent = emptyLabel;
    select.appendChild(none);

    mediaItems.forEach((asset) => {
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = `${asset.name} (${Math.round(asset.size / 1024)} KB)`;
        select.appendChild(option);
    });

    if (selectedId && mediaItems.some((asset) => asset.id === selectedId)) {
        select.value = selectedId;
    }
}

function renderPropertiesPanel() {
    if (!dom) {
        return;
    }

    const element = getSelectedElement();
    if (!element) {
        dom.elementTypeInput.value = "None";
        dom.elementContentInput.value = "";
        dom.elementXInput.value = "";
        dom.elementYInput.value = "";
        dom.elementWidthInput.value = "";
        dom.elementHeightInput.value = "";
        dom.elementCenteredInput.checked = false;
        dom.elementColorInput.value = "";
        dom.elementBgInput.value = "";
        dom.styleFontFamilyInput.value = "";
        dom.styleFontSizeInput.value = "";
        dom.styleFontWeightInput.value = "";
        dom.styleBorderStyleInput.value = "";
        dom.styleBorderWidthInput.value = "";
        dom.styleBorderColorInput.value = "";
        dom.styleBorderRadiusInput.value = "";
        dom.stylePaddingInput.value = "";
        dom.styleMarginInput.value = "";
        dom.elementStyleInput.value = "";
        dom.elementSelectionHint.textContent = "No element selected. Click an overlay in the card canvas to edit, or add a new element first.";
        document.querySelector('.no-selection')!.classList.add('hidden');
        syncColorInput(dom.elementColorPickerInput, "#111111", "#111111");
        syncColorInput(dom.elementBgColorPickerInput, "#ffffff", "#ffffff");
        updateGradientPreview();
        return;
    }

    dom.elementSelectionHint.textContent = "Tip: select an overlay on the card to edit it. Copy with Cmd/Ctrl+C and paste with Cmd/Ctrl+V.";
    document.querySelector('.no-selection')!.classList.remove('hidden');

    const isImageElement = element.type === "image";
    dom.elementTextField.style.display = isImageElement ? "none" : "flex";
    dom.elementImageField.style.display = isImageElement ? "flex" : "none";
    dom.elementImageActions.style.display = isImageElement ? "flex" : "none";

    dom.elementTypeInput.value = element.type;
    dom.elementContentInput.value = element.content;
    dom.elementXInput.value = String(roundTo(element.posX, 2));
    dom.elementYInput.value = String(roundTo(element.posY, 2));
    dom.elementWidthInput.value = String(roundTo(element.width, 2));
    dom.elementHeightInput.value = String(roundTo(element.height, 2));
    dom.elementCenteredInput.checked = Boolean(element.centered);
    dom.elementColorInput.value = element.style?.textColor ?? "#111111";
    dom.elementBgInput.value = element.style?.background ?? "transparent";
    const styles = element.style?.additionalStyles ?? {};
    dom.styleFontFamilyInput.value = styles["font-family"] ?? "";
    dom.styleFontSizeInput.value = styles["font-size"] ?? "";
    dom.styleFontWeightInput.value = styles["font-weight"] ?? "";
    dom.styleBorderStyleInput.value = styles["border-style"] ?? "";
    dom.styleBorderWidthInput.value = styles["border-width"] ?? "";
    dom.styleBorderColorInput.value = styles["border-color"] ?? "";
    dom.styleBorderRadiusInput.value = styles["border-radius"] ?? "";
    dom.stylePaddingInput.value = styles["padding"] ?? "";
    dom.styleMarginInput.value = styles["margin"] ?? "";
    syncColorInput(dom.elementColorPickerInput, dom.elementColorInput.value, "#111111");
    syncColorInput(dom.elementBgColorPickerInput, dom.elementBgInput.value, "#ffffff");
    syncColorInput(dom.styleBorderColorPickerInput, dom.styleBorderColorInput.value || "#111111", "#111111");
    syncGradientInputsFromBackground(dom.elementBgInput.value);
    dom.elementStyleInput.value = stringifyStyles(element.style?.additionalStyles ?? {});
}

function renderDataTable() {
    if (!dom) {
        return;
    }
    dom.dataTable.replaceChildren();
    const grid = dom.dataTable as HTMLDivElement;
    grid.classList.add('row-card-grid');

    state.doc.sampleRows.forEach((row, rowIndex) => {
        const card = document.createElement('div');
        card.className = 'row-card';
        if (rowIndex === state.selectedRowIndex) {
            card.classList.add('selected');
        }

        const header = document.createElement('div');
        header.className = 'row-card-header';
        
        const tmplId = state.doc.rowTemplateIds[rowIndex] ?? state.doc.activeTemplateId;
        const tmpl = getTemplateById(tmplId);
        const title = document.createElement('div');
        title.className = 'row-card-title';
        title.textContent = tmpl ? tmpl.name : 'Unknown Layout';
        header.appendChild(title);

        const amount = document.createElement('div');
        amount.className = 'row-card-amount';
        amount.textContent = `Amount: ${getRowAmount(rowIndex)}`;
        header.appendChild(amount);

        card.appendChild(header);

        const body = document.createElement('div');
        body.className = 'row-card-body';
        const vars = tmpl?.variables ?? [];
        vars.forEach((variable) => {
            const p = document.createElement('div');
            p.className = 'row-card-var';
            p.textContent = `${variable}: ${row[variable]?.toString().slice(0, 30) ?? ''}`;
            body.appendChild(p);
        });
        card.appendChild(body);

        const actions = document.createElement('div');
        actions.className = 'row-card-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-primary';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const templates = state.doc.templates.map((t, index) => `${t.name} (#${index + 1})`);
            const templateOptionToId: Record<string, string> = {};
            const templateIdToOption: Record<string, string> = {};
            const variableMap: Record<string, string[]> = {};
            state.doc.templates.forEach((t, index) => {
                const option = templates[index] || `${t.name} (#${index + 1})`;
                templateOptionToId[option] = t.id;
                templateIdToOption[t.id] = option;
                variableMap[option] = t.variables ?? [];
            });

            const initial: Record<string, any> = {};
            initial['Amount of Cards'] = getRowAmount(rowIndex);
            const currentTemplateOption = tmpl
                ? (templateIdToOption[tmpl.id] || templates[0] || "")
                : (templates[0] || "");
            initial['Card Type'] = currentTemplateOption;
            for (const v of vars) {
                initial[getCardVariableFieldLabel(currentTemplateOption, v)] = row[v] ?? '';
            }

            const result = await openNewCardModal(templates, variableMap, initial);
            if (!result) return;

            const selectedOption = String(result['Card Type'] ?? '');
            const selectedId = templateOptionToId[selectedOption] ?? '';
            const found = state.doc.templates.find((t) => t.id === selectedId);
            if (!found) return;

            applyMutation(() => {
                state.doc.rowTemplateIds[rowIndex] = found.id;
                state.doc.rowAmounts[rowIndex] = Number.isFinite(Number(result['Amount of Cards'])) ? Math.floor(Number(result['Amount of Cards'])) : 1;
                for (const v of found.variables) {
                    const key = getCardVariableFieldLabel(selectedOption, v);
                    const targetRow = state.doc.sampleRows[rowIndex] ?? (state.doc.sampleRows[rowIndex] = {});
                    targetRow[v] = result[key] !== undefined ? String(result[key]) : '';
                }
                state.selectedRowIndex = rowIndex;
            });
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-error';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyMutation(() => {
                state.doc.sampleRows.splice(rowIndex, 1);
                state.doc.rowTemplateIds.splice(rowIndex, 1);
                state.doc.rowAmounts.splice(rowIndex, 1);
                state.selectedRowIndex = Math.max(0, state.selectedRowIndex - 1);
            });
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        card.appendChild(actions);

        card.addEventListener('click', () => {
            state.selectedRowIndex = rowIndex;
            renderCanvas();
            renderDataTable();
        });

        grid.appendChild(card);
    });
}

function renderCanvas() {
    if (!dom) {
        return;
    }

    hideCustomContextMenu();

    dom.renderCard.classList.toggle("single", state.viewMode === "single");
    dom.renderCard.replaceChildren();

    if (state.viewMode === "deck") {
        renderDeckPreview();
        return;
    }

    const activeTemplate = getActiveTemplate();
    const data = state.doc.sampleRows[state.selectedRowIndex] ?? {};
    const spec = toCardSpecification(activeTemplate, state.selectedRowIndex);
    const card = new Card(spec, data);
    const cardElement = card.getRender();

    const canvas = document.createElement("div");
    canvas.className = "editor-canvas";
    canvas.appendChild(cardElement);

    const gridOverlay = document.createElement("div");
    gridOverlay.className = "grid-overlay";
    if (state.snapEnabled) {
        gridOverlay.style.backgroundImage = "linear-gradient(to right, rgba(77,128,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(77,128,255,0.3) 1px, transparent 1px)";
        gridOverlay.style.backgroundSize = `${state.gridSizeMm}mm ${state.gridSizeMm}mm`;
    }
    canvas.appendChild(gridOverlay);

    activeTemplate.spec.layout.forEach((element, index) => {
        const overlay = document.createElement("div");
        overlay.className = "editor-overlay";
        if (index === state.selectedElementIndex) {
            overlay.classList.add("selected");
        }

        overlay.style.left = `${element.posX}mm`;
        overlay.style.top = `${element.posY}mm`;
        overlay.style.width = `${Math.max(1, element.width)}mm`;
        overlay.style.height = `${Math.max(1, element.height)}mm`;
        if (element.centered) {
            overlay.style.transform = "translate(-50%, -50%)";
        }

        overlay.addEventListener("mousedown", (event) => {
            if (event.button !== 0) {
                return;
            }
            event.stopPropagation();
            state.selectedElementIndex = index;
            startDrag(event, index, "move");
        });

        overlay.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.selectedElementIndex = index;
            renderPropertiesPanel();
            openCustomContextMenu(event.clientX, event.clientY);
        });

        ["nw", "ne", "sw", "se"].forEach((dir) => {
            const handle = document.createElement("div");
            handle.className = `resize-handle ${dir}`;
            handle.addEventListener("mousedown", (event) => {
                if (event.button !== 0) {
                    return;
                }
                event.stopPropagation();
                state.selectedElementIndex = index;
                startDrag(event, index, `resize-${dir}` as DragAction);
            });
            overlay.appendChild(handle);
        });

        canvas.appendChild(overlay);
    });

    canvas.addEventListener("mousedown", (event) => {
        if (event.button !== 0) {
            return;
        }
        state.selectedElementIndex = null;
        renderPropertiesPanel();
        renderCanvas();
    });

    canvas.addEventListener("contextmenu", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest(".editor-overlay")) {
            return;
        }
        event.preventDefault();
        state.selectedElementIndex = null;
        renderPropertiesPanel();
        openCustomContextMenu(event.clientX, event.clientY);
    });

    dom.renderCard.appendChild(canvas);
    renderPropertiesPanel();
}

function renderDeckPreview() {
    if (!dom) {
        return;
    }

    const fragment = document.createDocumentFragment();
    getDeckRowInstances().forEach((instance) => {
        const spec = toCardSpecification(instance.template, instance.cardIndex);
        const rendered = new Card(spec, instance.row).getRender();
        rendered.style.cursor = "pointer";
        rendered.title = `Card ${instance.cardIndex + 1} (Card ${instance.rowIndex + 1}, Copy ${instance.copyIndex + 1})`;

        if (instance.rowIndex === state.selectedRowIndex) {
            rendered.style.outline = "0.6mm solid #4d80ff";
            rendered.style.outlineOffset = "0.5mm";
        }

        rendered.addEventListener("click", () => {
            state.selectedRowIndex = instance.rowIndex;
            renderDataTable();
            renderCanvas();
        });

        fragment.appendChild(rendered);
    });

    dom.renderCard.appendChild(fragment);
}

function startDrag(event: MouseEvent, index: number, action: DragAction) {
    const element = getActiveTemplate().spec.layout[index];
    if (!element) {
        return;
    }

    state.drag = {
        action,
        index,
        startX: event.clientX,
        startY: event.clientY,
        startElement: clone(element),
        historyBefore: snapshotDocument()
    };

    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", stopDrag);
    const overlay = dom?.renderCard.querySelectorAll(".editor-overlay")[index] as HTMLElement | undefined;
    overlay?.classList.add("is-dragging");
    dom?.renderCard.firstElementChild?.classList.add("is-dragging");
}

function onDragMove(event: MouseEvent) {
    if (!state.drag || !dom?.renderCard.firstElementChild) {
        return;
    }

    const targetElement = getActiveTemplate().spec.layout[state.drag.index];
    if (!targetElement) {
        return;
    }

    const cardElement = dom.renderCard.querySelector(".card") as HTMLElement | null;
    if (!cardElement) {
        return;
    }

    const activeTemplate = getActiveTemplate();
    const rect = cardElement.getBoundingClientRect();
    const pxPerMmX = rect.width / activeTemplate.spec.width;
    const pxPerMmY = rect.height / activeTemplate.spec.height;

    const dxMm = (event.clientX - state.drag.startX) / pxPerMmX;
    const dyMm = (event.clientY - state.drag.startY) / pxPerMmY;

    let nextX = state.drag.startElement.posX;
    let nextY = state.drag.startElement.posY;
    let nextWidth = state.drag.startElement.width;
    let nextHeight = state.drag.startElement.height;

    if (state.drag.action === "move") {
        nextX += dxMm;
        nextY += dyMm;
    } else if (state.drag.action === "resize-se") {
        nextWidth += dxMm;
        nextHeight += dyMm;
    } else if (state.drag.action === "resize-sw") {
        nextX += dxMm;
        nextWidth -= dxMm;
        nextHeight += dyMm;
    } else if (state.drag.action === "resize-ne") {
        nextY += dyMm;
        nextWidth += dxMm;
        nextHeight -= dyMm;
    } else {
        nextX += dxMm;
        nextY += dyMm;
        nextWidth -= dxMm;
        nextHeight -= dyMm;
    }

    if (state.snapEnabled) {
        nextX = snapToGrid(nextX);
        nextY = snapToGrid(nextY);
        nextWidth = snapToGrid(nextWidth);
        nextHeight = snapToGrid(nextHeight);
    }

    targetElement.posX = sanitizeCoordinate(nextX);
    targetElement.posY = sanitizeCoordinate(nextY);
    targetElement.width = clampNumber(nextWidth, 1, activeTemplate.spec.width * 2);
    targetElement.height = clampNumber(nextHeight, 1, activeTemplate.spec.height * 2);

    state.dirty = true;
    scheduleAutosave();
    renderCanvas();
    renderToolbarState();
}

function stopDrag() {
    if (state.drag) {
        const after = snapshotDocument();
        if (after !== state.drag.historyBefore) {
            pushHistory(state.drag.historyBefore);
        }
    }

    state.drag = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", stopDrag);
    const draggingOverlay = dom?.renderCard.querySelector(".editor-overlay.is-dragging") as HTMLElement | null;
    draggingOverlay?.classList.remove("is-dragging");
    dom?.renderCard.firstElementChild?.classList.remove("is-dragging");
    renderAll();
}

function openSavedDeckModal(trigger: HTMLElement | null) {
    if (!dom) {
        return;
    }

    savedDecksModalTrigger = trigger;
    renderSavedDeckCards();
    dom.savedDecksModal.showModal();

    const firstCard = dom.savedDecksGrid.querySelector(".saved-deck-open-btn") as HTMLButtonElement | null;
    if (firstCard) {
        firstCard.focus();
        return;
    }

    dom.savedDecksCloseBtn.focus();
}

function closeSavedDeckModal() {
    if (!dom || !dom.savedDecksModal.open) {
        return;
    }

    dom.savedDecksModal.close();
    savedDecksModalTrigger?.focus();
    savedDecksModalTrigger = null;
}

function parseStyleText(text: string): Record<string, string> {
    const styles: Record<string, string> = {};
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }
        const separator = trimmed.indexOf(":");
        if (separator < 1) {
            continue;
        }

        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        if (key && value) {
            styles[key] = value;
        }
    }

    return styles;
}

function stringifyStyles(styles: Record<string, string>): string {
    return Object.entries(styles)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
}

function setElementAdditionalStyle(element: EditorLayoutElement, key: string, value: string) {
    const style = ensureElementStyle(element);
    const next = value.trim();
    if (!next) {
        delete style.additionalStyles?.[key];
        return;
    }
    style.additionalStyles![key] = next;
}

function sanitizeCoordinate(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return roundTo(value, 2);
}

function clampNumber(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.max(min, Math.min(max, value));
}

function snapToGrid(value: number): number {
    const grid = Math.max(0.5, state.gridSizeMm);
    return roundTo(Math.round(value / grid) * grid, 2);
}

function roundTo(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function syncColorInput(input: HTMLInputElement | undefined, cssValue: string, fallback: string) {
    if (!input) {
        return;
    }

    const value = cssValue.trim();
    if (/^#[0-9a-f]{6}$/i.test(value) || /^#[0-9a-f]{3}$/i.test(value)) {
        input.value = normalizeHexColor(value);
        return;
    }

    const rgbMatch = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgbMatch) {
        const r = clampNumber(Number(rgbMatch[1] || 0), 0, 255);
        const g = clampNumber(Number(rgbMatch[2] || 0), 0, 255);
        const b = clampNumber(Number(rgbMatch[3] || 0), 0, 255);
        input.value = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        return;
    }

    input.value = normalizeHexColor(fallback);
}

function normalizeHexColor(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
        return trimmed;
    }
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return "#000000";
}

function toHex(value: number): string {
    return Math.round(value).toString(16).padStart(2, "0");
}

function setStatus(text: string, tone: "info" | "error" | "muted" = "info") {
    if (!dom) {
        return;
    }

    dom.statusLabel.textContent = text;

    const toast = document.createElement("div");
    toast.className = "toast";
    if (tone === "error") {
        toast.classList.add("is-error");
    } else if (tone === "muted") {
        toast.classList.add("is-muted");
    }

    toast.textContent = text;
    dom.toastStack.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(6px)";
    }, 2300);

    window.setTimeout(() => {
        toast.remove();
    }, 2600);
}
