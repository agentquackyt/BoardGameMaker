import { Card } from "./Card";
import type { CardDeck } from "./CardDeck";

class CardStack {
    private cards: Card[] = [];
    private hidden: boolean = true;
    constructor(public name: string, cardDeck?: CardDeck) {
        if (cardDeck) {
            this.cards = cardDeck.getCards();
        }
    }

    addCard(card: Card) {
        this.cards.push(card);
    }

    setHidden(hidden: boolean) {
        this.hidden = hidden;
    }

    isHidden(): boolean {
        return this.hidden;
    }

    draw(): Card | null {
        if (this.cards.length === 0) {
            return null;
        }
        return this.cards.pop()!;
    }

    drawCards(count: number): Card[] {
        const drawnCards: Card[] = [];
        for (let i = 0; i < count; i++) {
            const card = this.draw();
            if (card) {
                drawnCards.push(card);
            } else {
                break;
            }
        }
        return drawnCards;
    }

    drawFromBottom(): Card | null {
        if (this.cards.length === 0) {
            return null;
        }
        return this.cards.shift()!;
    }

    drawCardsFromBottom(count: number): Card[] {
        const drawnCards: Card[] = [];
        for (let i = 0; i < count; i++) {
            const card = this.drawFromBottom();
            if (card) {
                drawnCards.push(card);
            } else {
                break;
            }
        }
        return drawnCards;
    }

    viewTopCard(count?: number): Card | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }
        if (count === undefined) {
            return this.cards[this.cards.length - 1];
        }
        return this.cards.slice(-count).pop();
    }

    viewBottomCard(count?: number): Card | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }
        if (count === undefined) {
            return this.cards[0];
        }
        return this.cards.slice(0, count)[0];
    }

    getCardCount(): number {
        return this.cards.length;
    }

    shuffle(count: number = 1) {
        for (let i = 0; i < count; i++) {
            for (let i = this.cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // @ts-expect-error - This is a common shuffle algorithm (Fisher-Yates), and the type error is due to the fact that we know the indices are valid.
                [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
            }
        }
    }
}