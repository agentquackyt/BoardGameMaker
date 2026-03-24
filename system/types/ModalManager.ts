type ModalDataType = 'text' | 'number' | 'color' | 'boolean' | 'mm' | 'select';

interface ModalField {
    label: string;
    key: string;
    type: ModalDataType;
    required: boolean;
    defaultValue?: any;
    options?: string[]; // For select fields
    condition?: ConditionalField[]; // For conditional fields
}


/**
 * Requires that a different field has a specific value to be shown. This is used for conditional fields, e.g. show "Country" select field only if "Subscribe to Newsletter" is true.
 */
interface ConditionalField {
    conditionLabel: string;
    conditionValue: any;
}


function clampNumber(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.max(min, Math.min(max, value));
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

class Modal {
    private fields: ModalField[];
    private title: string;
    private description?: string;
    private modalElement: HTMLDialogElement;

    constructor(title: string, description?: string, buttonText: string = 'Apply') {
        this.title = title;
        this.description = description;
        this.fields = [];
        this.modalElement = document.createElement('dialog');
        this.modalElement.classList.add('modal');

        this.modalElement.innerHTML = `
            <h2 class="modal-title"></h2>
            <p class="modal-description"></p>
            <div class="modal-body"></div>
            <button class="modal-submit btn btn-primary">${buttonText}</button>
        `;

        document.body.appendChild(this.modalElement);
    }


    addTextField(label: string, defaultValue?: string, required: boolean = false): Modal {
        this.fields.push({ label, key: label.toLowerCase().replace(' ', '_'), type: 'text', required, defaultValue });
        return this;
    }

    addNumberField(label: string, defaultValue?: number, required: boolean = false): Modal {
        this.fields.push({ label, key: label.toLowerCase().replace(' ', '_'), type: 'number', required, defaultValue });
        return this;
    }

    addColorField(label: string, defaultValue?: string, required: boolean = false): Modal {
        this.fields.push({ label, key: label.toLowerCase().replace(' ', '_'), type: 'color', required, defaultValue });
        return this;
    }

    addBooleanField(label: string, defaultValue?: boolean, required: boolean = false): Modal {
        this.fields.push({ label, key: label.toLowerCase().replace(' ', '_'), type: 'boolean', required, defaultValue });
        return this;
    }

    addMillimeterField(label: string, defaultValue?: number, required: boolean = false): Modal {
        this.fields.push({ label, key: label.toLowerCase().replace(' ', '_'), type: 'mm', required, defaultValue });
        return this;
    }

    addSelectField(label: string, options: string[], defaultValue?: string, required: boolean = false): Modal {
        this.fields.push({ label, key: label.toLowerCase().replace(' ', '_'), type: 'select', required, defaultValue, options });
        return this;
    }

    setConditionalField(label: string, conditionLabel: string, conditionValue: any): Modal {
        const field = this.fields.find(f => f.label === label);
        if (field) {
            if (!field.condition) {
                field.condition = [];
            }
            field.condition.push({ conditionLabel, conditionValue });
        }
        return this;
    }

    getFields(): ModalField[] {
        return this.fields;
    }

    private constructModalFromFields(fields: ModalField[], modalBody: HTMLElement): HTMLElement {

        modalBody.innerHTML = ''; // Clear previous content

        fields.forEach(field => {
            const label = document.createElement('label');
            label.classList.add('field')
            const spanElement = document.createElement('span');
            spanElement.textContent = field.label + (field.required ? ' *' : '');
            label.appendChild(spanElement);

            let input: HTMLInputElement | HTMLSelectElement;

            switch (field.type) {
                case 'text':
                    input = document.createElement('input');
                    input.type = 'text';
                    break;
                case 'number':
                    input = document.createElement('input');
                    input.type = 'number';
                    break;
                case 'color':
                    input = document.createElement('input');
                    input.type = 'color';
                    break;
                case 'boolean':
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    break;
                case 'mm':
                    input = document.createElement('input') as HTMLInputElement;
                    input.type = 'number';
                    input.step = '0.01';
                    input.min = '0';
                    input.placeholder = '0mm';
                    break;
                case 'select':
                    input = document.createElement('select');
                    field.options?.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option;
                        optionElement.textContent = option;
                        input.appendChild(optionElement);
                    });
                    break;

                default:
                    throw new Error(`Unsupported field type: ${field.type}`);
            }
            input.value = field.defaultValue !== undefined ? field.defaultValue : (field.type === 'boolean' ? 'false' : '');

            label.appendChild(input);
            if (field.type === 'color') {
                let colorTextInput = document.createElement('input');
                colorTextInput.type = 'text';
                colorTextInput.placeholder = '#RRGGBB';
                colorTextInput.value = field.defaultValue || '';
                label.appendChild(colorTextInput);

                syncColorInput(colorTextInput, field.defaultValue || '#000000', '#000000');
                input.addEventListener('input', () => {
                    syncColorInput(colorTextInput, input.value, '#000000');
                });
                colorTextInput.addEventListener('input', () => {
                    syncColorInput(input as HTMLInputElement, colorTextInput.value, '#000000');
                });
            }

            // Set data attribute for conditional logic
            if (field.condition) {
                label.setAttribute('data-conditional', 'true');
            }
            label.setAttribute('data-field-label', field.label);
            label.setAttribute('data-field-type', field.type);


            // Handle conditional fields
            if (field.condition) {
                const updateVisibility = () => {
                    let shouldShow = true;
                    for (const condition of field.condition!) {
                        // Use the data-field-label attribute we set earlier to find the related field
                        const selector = `label[data-field-label="${condition.conditionLabel}"] input, label[data-field-label="${condition.conditionLabel}"] select`;
                        const relatedField = modalBody.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;

                        if (relatedField) {
                            let relatedValue: any;
                            if (relatedField.type === 'checkbox') {
                                relatedValue = (relatedField as HTMLInputElement).checked;
                            } else {
                                relatedValue = relatedField.value;
                            }

                            if (relatedValue != condition.conditionValue) {
                                shouldShow = false;
                                break;
                            }
                        }
                    }
                    label.style.display = shouldShow ? '' : 'none';
                };

                field.condition.forEach(condition => {
                    // Corrected selector to avoid the :contains SyntaxError
                    const selector = `label[data-field-label="${condition.conditionLabel}"] input, label[data-field-label="${condition.conditionLabel}"] select`;
                    const relatedField = modalBody.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;

                    if (relatedField) {
                        relatedField.addEventListener('input', updateVisibility);
                        if (relatedField.type === 'checkbox') {
                            relatedField.addEventListener('change', updateVisibility);
                        }
                    }
                });

                // Initial visibility check
                updateVisibility();
            }

            modalBody.appendChild(label);
        });

        return modalBody;
    }

    async show(): Promise<{ [key: string]: any } | null> {
        const modalContent = this.constructModalFromFields(this.fields, this.modalElement.querySelector('.modal-body')!);
        this.modalElement.querySelector('.modal-title')!.textContent = this.title;
        this.modalElement.querySelector('.modal-description')!.textContent = this.description || '';

        //this.modalElement.querySelector('.modal-body')!.innerHTML = '';
        this.modalElement.querySelector('.modal-body')!.replaceWith(modalContent);

        this.modalElement.showModal();


        return new Promise((resolve) => {
            const submitButton = this.modalElement.querySelector('.modal-submit') as HTMLButtonElement;
            submitButton.onclick = () => {
                const formData: { [key: string]: any } = {};
                this.fields.forEach((field, index) => {
                    const input = this.modalElement.querySelectorAll('.modal-body input')[index] as HTMLInputElement;
                    formData[field.label] = field.type === 'boolean' ? input.checked : input.value;
                    if (field.type === 'mm' || field.type === 'number') {
                        formData[field.label] = parseFloat(input.value);
                    }
                });
                submitButton.onclick = null; // Remove event listener
                this.modalElement.onclose = null; // Remove close event listener
                resolve(formData);
                this.modalElement.close();
            };

            this.modalElement.onclose = () => {
                submitButton.onclick = null; // Remove event listener
                this.modalElement.onclose = null; // Remove close event listener
                resolve(null);
            };
        });
    }
}

export default Modal;