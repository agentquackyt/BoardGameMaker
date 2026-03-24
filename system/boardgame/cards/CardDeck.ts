import { Storage } from "../abstract/Storage";
import { Card, type CardSpecification } from "./Card";

type StoredCard = {
    spec: CardSpecification;
    data: Record<string, any>;
};

type StoredCardDeck = {
    uuid: string;
    name: string;
    cards: StoredCard[];
};

class CardDeck extends Storage {
    private static readonly storagePrefix = "boardgame.card-deck";

    private cards: Card[] = [];

    constructor(public name: string, public uuid: string = crypto.randomUUID()) {
        super();
    }

    addCard(card: Card) {
        this.cards.push(card);
    }
    
    removeCard(card: Card) {
        const index = this.cards.indexOf(card);
        if(index !== -1) {
            this.cards.splice(index, 1);
        }
    }
    
    getCards(): Card[] {
        return this.cards;
    }

    getAllSavedItems(): string[] {
        if (typeof localStorage === "undefined") {
            return [];
        }

        const savedDeckIds: string[] = [];

        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key === null || !key.startsWith(`${CardDeck.storagePrefix}:`)) {
                continue;
            }

            savedDeckIds.push(key.slice(CardDeck.storagePrefix.length + 1));
        }

        return savedDeckIds;
    }

    private getStorageKey(uuid: string = this.uuid): string {
        return `${CardDeck.storagePrefix}:${uuid}`;
    }

    private serialize(): StoredCardDeck {
        return {
            uuid: this.uuid,
            name: this.name,
            cards: this.cards.map((card) => ({
                spec: card.getSpecifications(),
                data: card.getData()
            }))
        };
    }

    toLocalStorage(): string {
        if (typeof localStorage === "undefined") {
            throw new Error("localStorage is not available in this environment.");
        }

        const storageKey = this.getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(this.serialize()));
        return this.uuid;
    }

    fromLocalStorage(uuid: string): this {
        if (typeof localStorage === "undefined") {
            throw new Error("localStorage is not available in this environment.");
        }

        const rawDeck = localStorage.getItem(this.getStorageKey(uuid));
        if (rawDeck === null) {
            throw new Error(`No saved card deck found for uuid "${uuid}".`);
        }

        const storedDeck = JSON.parse(rawDeck) as StoredCardDeck;
        this.uuid = storedDeck.uuid ?? uuid;
        this.name = storedDeck.name ?? this.name;
        this.cards = storedDeck.cards.map((storedCard) => new Card(storedCard.spec, storedCard.data));

        return this;
    }

    static loadFromLocalStorage(uuid: string): CardDeck {
        return new CardDeck("Untitled deck", uuid).fromLocalStorage(uuid);
    }

    
}

export { CardDeck };