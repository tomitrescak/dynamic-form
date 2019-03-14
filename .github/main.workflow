workflow "Build, Test, and Publish" {
  on = "push"
  resolves = ["Test"]
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

