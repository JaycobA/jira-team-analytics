Config.withInferredConfig((config) => {
  const API_URL = config.get("origin") + '/rest';
  let fullPeriodLength = config.get("weeks") * 7;

  let data = {
    filterQuery: config.get("filterQuery"),
    weeks: config.get("weeks"),
    expectedDailyPoints: config.get("expectedDailyPoints"),
    defaultPoints: config.get("defaultPoints"),
    issues: [],
    weekLegend: []
  };

  let app = new Vue({
    el: '#app',
    data,
    computed: {
      issueBars: () => {
        return _.map(data.issues, (issue) => {
          let daysFromPeriodStart = (date) => {
            let periodStart = moment().subtract(config.get("weeks"), 'week');
            return date.diff(periodStart, 'days');
          }

          let bars = _.map(issue.workPeriods, (workPeriod) => {
            let daysToStart = Math.max(0, daysFromPeriodStart(workPeriod.start));
            let daysToEnd = daysFromPeriodStart(workPeriod.end);
            let workPeriodLength = daysToEnd - daysToStart + 1;

            let width = (workPeriodLength / fullPeriodLength) * 100 + '%';
            let offsetLeft = (daysToStart / fullPeriodLength) * 100 + '%';
            let expectedPointsPerDay = config.get("expectedDailyPoints");
            let backgroundColor = `hsl(${Math.min(expectedPointsPerDay, issue.workPerDayInProgress) / expectedPointsPerDay * 120}, 80%, 80%)`;

            return { width, offsetLeft, backgroundColor };
          });

          return { key: issue.key, bars };
        });
      }
    },
    methods: {
      saveConfig: () => {
        config.set("filterQuery", data.filterQuery);
        config.set("weeks", data.weeks);
        config.set("expectedDailyPoints", data.expectedDailyPoints);
        config.set("defaultPoints", data.defaultPoints);
        config.save();
      }
    }
  });

  let jiraClient = new JiraClient(API_URL);
  let jql = `${config.get("filterQuery")} AND issuetype not in subTaskIssueTypes() and issuetype != "Epic" and status was "In Progress" after -${config.get("weeks")}w order by resolutiondate ASC`;

  jiraClient.search(jql).then((issues) => {
    let workDone = _.chain(issues)
      .map((issue) => {
        return Issue.fromApiResult(issue, config.get("defaultPoints"));
      }).filter((issue) => {
        return issue.timeInProgress > 0;
      }).value();

    console.log(workDone);

    for(let i = 0; i < workDone.length; i++) {
      data.issues.push(workDone[i]);
    }

    for(let i = 0; i < config.get("weeks"); i++) {
      data.weekLegend.push({ number: i });
    }
  });
});
