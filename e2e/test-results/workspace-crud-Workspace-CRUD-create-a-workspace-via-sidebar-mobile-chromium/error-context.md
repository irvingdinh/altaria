# Page snapshot

```yaml
- generic [active]:
  - generic:
    - generic:
      - generic:
        - banner:
          - generic:
            - button:
              - img
            - generic:
              - button:
                - img
                - generic: Toggle theme
        - generic:
          - main:
            - main:
              - generic:
                - paragraph: Select a workspace from the sidebar to get started
    - region "Notifications alt+T"
  - dialog "Sidebar" [ref=e2]:
    - generic [ref=e3]:
      - heading "Sidebar" [level=2]
      - paragraph: Displays the mobile sidebar.
    - generic [ref=e7]:
      - generic [ref=e8]: Workspaces
      - button "New Workspace" [ref=e9]:
        - img [ref=e10]
        - generic [ref=e11]: New Workspace
      - list [ref=e13]:
        - listitem [ref=e15]:
          - button "Test Workspace" [expanded] [ref=e16]:
            - img [ref=e17]
            - generic [ref=e19]: Test Workspace
          - button "More" [ref=e20]:
            - img [ref=e21]
            - generic [ref=e25]: More
          - list [ref=e27]
```