class Config {
  constructor() {
    this.values = {};
  }

  static withInferredConfig(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      let config = new Config();
      config.load();
      config.set("origin", new URL(tabs[0].url).origin);
      callback(config);
    });
  }

  set(key, value) {
    this.values[key] = value;
  }

  get(key) {
    return this.values[key];
  }

  save() {
    localStorage.setItem("config", JSON.stringify(this.values));
  }

  load() {
    this.values = JSON.parse(localStorage.getItem("config")) || { };
  }
}

