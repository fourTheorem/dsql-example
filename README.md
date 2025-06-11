# DSQL Example

## Prerequisites

- A recent [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) version that supports DSQL (`aws dsql`).
- Node.js 22 or later

## Creating the Schema

```shell
cat packages/db/drizzle/*.sql | ./bin/dsql-connect --hostname riabuesefmctvmgwk2nhkam7oi.dsql.eu-west-1.on.aws --region eu-west-1 --database postgres --username admin
```
