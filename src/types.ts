export interface InsomniaStore {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export interface InsomniaApp {
  alert(title: string, message: string): Promise<void>
  prompt(
    title: string,
    options: {
      label: string
      defaultValue?: string
      submitName: string
      cancelable: boolean
    }
  ): Promise<string | null>
}

export interface InsomniaContext {
  store: InsomniaStore
  app: InsomniaApp
}
