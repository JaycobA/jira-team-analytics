class JiraClient {
  constructor(endpointUri) {
    this.endpointUri = endpointUri;
  }

  call(path) {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();

      xhr.open("GET", `${this.endpointUri}/${path}`);
      xhr.responseType = 'json';
      xhr.onreadystatechange = () => {
        if(xhr.readyState === XMLHttpRequest.DONE) {
          resolve(xhr.response);
        }
      };
      xhr.send();
    });
  }

  search(jql) {
    return this.call(`api/2/search?jql=${encodeURIComponent(jql)}&fields=customfield_10006,resolutiondate,key&expand=changelog`)
      .then((result) => {
        console.log(result.issues);
        return result.issues;
      });
  }
}
