Project Name:
Spotify Artist Collaboration Graph Explorer

Project Description:
This project builds an implementation-focused system that finds collaboration connections between two musical artists using Spotify data. Artists are modeled as nodes and collaborations are modeled as edges, and the application uses bidirectional BFS to compute a shortest-hop path between the selected source and target artists. The app includes a web interface with artist search, advanced search limits, path output, and graph visualization for both the shortest path and the explored BFS subgraph. In addition to returning the path, the system reports search analytics such as explored nodes/edges, graph density, average node degree, frontier layers expanded, and bidirectional balance score. Overall, the project demonstrates how graph algorithms can be applied to a real-world social-network-style dataset.

Project Categories Used:
1) Graph and Graph Algorithms: We represent artists as graph nodes and collaborations as graph edges, then use bidirectional BFS to compute a shortest-hop path between two artists.
2) Social Networks: The collaboration network models real social-style relationships in music, where artists form communities through repeated co-appearances and bridge connections across groups.

Work Breakdown:
- Ryan Zhou: graph construction/data structures, BFS path logic integration, analytics display, graph visualization and UI behavior.
- Eric Moon: Spotify API integration, token/auth handling, artist/album/track retrieval flow, backend endpoint wiring.
- Both: BFS testing/tuning, output formatting, debugging, and end-to-end validation of search results.

AI Usage:
- AI was used for debugging assistance, brainstorming graph analytics metrics, and guidance on Spotify API handling/rate limiting. All core implementation logic, graph construction, BFS traversal, visualization integration, and final code understanding were completed and verified by the project team.
