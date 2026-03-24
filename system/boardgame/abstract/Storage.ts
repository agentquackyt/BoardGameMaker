
abstract class Storage {

    abstract getAllSavedItems(): string[];

    abstract toLocalStorage(): string;
    abstract fromLocalStorage(uuid: string): this;
}

export { Storage };