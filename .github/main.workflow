workflow "Build, Test, and Publish" {
  on = "push"
  resolves = ["Deploy Notification"]
}

action "Install Packages" {
  uses = "borales/actions-yarn@master"
  args = "install"
}

action "Test" {
  needs = ["Install Packages"]
  uses = "borales/actions-yarn@master"
  args = "test"
}

action "Deploy Notification" {
  needs = "Test"
  uses = "apex/actions/slack@master"
  secrets = ["SLACK_WEBHOOK_URL"]
}
