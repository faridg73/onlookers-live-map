import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Create the window FIRST so the bridge view controller's view (the
        // WKWebView) is laid out against the real device bounds. Calling
        // loadViewIfNeeded() before the window exists sizes the web view to the
        // storyboard's legacy 375x667 canvas, so the very first paint after a
        // cold launch renders at the wrong width (clipped cards, off-screen
        // buttons, grid re-scaling once layout corrects itself).
        let window = UIWindow(windowScene: windowScene)
        let bridgeViewController = CAPBridgeViewController()
        window.rootViewController = bridgeViewController
        self.window = window
        window.makeKeyAndVisible()

        // Force a synchronous layout pass so the web view has final bounds
        // before WebKit evaluates the viewport for its first frame.
        window.layoutIfNeeded()
        bridgeViewController.view.setNeedsLayout()
        bridgeViewController.view.layoutIfNeeded()

        bridgeViewController.webView?.allowsBackForwardNavigationGestures = true
        bridgeViewController.webView?.scrollView.bounces = true
        bridgeViewController.webView?.scrollView.alwaysBounceVertical = false
        bridgeViewController.webView?.isOpaque = false
        bridgeViewController.webView?.backgroundColor = .black
        bridgeViewController.webView?.scrollView.backgroundColor = .black

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
