<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Native releases use Capacitor 8 with a remote `https://onlooker.io` WebView shell; keep native behavior centralized in `src/lib/native.ts` so web behavior stays unchanged.
- Release automation must preserve a signed Android APK/AAB and an iOS IPA artifact; iOS signing uses the decoded profile name explicitly so CI does not depend on a developer machine.
