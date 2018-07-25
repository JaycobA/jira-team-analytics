Config.withInferredConfig((config) => {
  const API_URL = config.get("origin") + '/rest';

  let data = Bind({
    filterQuery: config.get("filterQuery"),
    issues: []
  }, {
    filterQuery: {
      dom: '#filter-query',
      callback: (value) => {
        config.set("filterQuery", value);
        config.save(config);
      }
    },
    issues: {
      dom: '#issue-schedule',
      transform: (issue) => {
        let daysFromPeriodStart = (date) => {
          let periodStart = moment().subtract(8, 'week');
          return date.diff(periodStart, 'days');
        }

        let fullPeriodLength = 8 * 7;

        let bars = _.reduce(issue.workPeriods, (html, workPeriod) => {
          let daysToStart = daysFromPeriodStart(workPeriod.start);
          let daysToEnd = daysFromPeriodStart(workPeriod.end);
          let workPeriodLength = daysToEnd - daysToStart + 1;

          let issueWidth = (workPeriodLength / fullPeriodLength) * 100 + '%';
          let offsetLeft = (daysToStart / fullPeriodLength) * 100 + '%';
          return html + `<div class="issue-bar" style="width: ${issueWidth}; margin-left: ${offsetLeft}"></div>`
        }, "");
        return `<div><div class="issue-title">${issue.key}</div>${bars}</div>`;
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

    console.log(workDone);

    for(let i = 0; i < workDone.length; i++) {
      data.issues.push(workDone[i]);
    }
  });
});
