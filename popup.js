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

    let periodEnd = moment();
    let periodStart = moment().subtract(8, 'weeks');
    let currentDay = periodStart;

    let workDonePerWeek = {};

    for(let currentDay = periodStart; currentDay <= periodEnd; currentDay.add(1, 'days')) {
      if(currentDay.day() == 0 || currentDay.day() == 6) {
        continue;
      }

      let issuesWorkedOn = [];
      let workForCurrentDay = _.reduce(workDone, (sum, issue) => {
        let workedAtCurrentDay = _.chain(issue.workPeriods)
          .map((workPeriod) => {
            return currentDay.isBetween(workPeriod.start, workPeriod.end);
          }).some().value();
        if(workedAtCurrentDay) {
          sum += issue.workPerDayInProgress;
          issuesWorkedOn.push(issue.key);
        }
        return sum;
      }, 0);

      let calendarWeek = currentDay.week();
      if(!workDonePerWeek[calendarWeek]) {
        workDonePerWeek[calendarWeek] = { work: 0, issues: [] };
      }
      workDonePerWeek[calendarWeek].work += workForCurrentDay;
      workDonePerWeek[calendarWeek].issues = _.uniq(workDonePerWeek[calendarWeek].issues.concat(issuesWorkedOn));
    }

    console.log(workDonePerWeek);
  });
});
