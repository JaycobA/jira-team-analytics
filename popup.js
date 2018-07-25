Config.withInferredConfig((config) => {
  const API_URL = config.get("origin") + '/rest';

  let data = Bind({
    filterQuery: config.get("filterQuery")
  }, {
    filterQuery: {
      dom: '#filter-query',
      callback: (value) => {
        config.set("filterQuery", value);
        config.save(config);
      }
    }
  });

  let jiraClient = new JiraClient(API_URL);
  let jql = `${config.get("filterQuery")} AND issuetype not in subTaskIssueTypes() and resolutiondate > -6w order by resolutiondate desc`;

  jiraClient.search(jql).then((issues) => {
    let workDone = _.chain(issues)
      .map((issue) => {
        return Issue.fromApiResult(issue);
      }).filter((issue) => {
        return issue.timeInProgress > 0;
      }).value();

    console.log(new WorkloadService(workDone).storyPointsPerWeek());
  });
});
