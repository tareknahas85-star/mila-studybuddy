import { Component, type ReactNode } from 'react'

/** إذا صار خطأ مفاجئ: رسالة واضحة وزر رجوع، بدل شاشة بيضا. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }

  static getDerivedStateFromError(e: unknown): { error: string } {
    return { error: e instanceof Error ? e.message : String(e) }
  }

  render() {
    if (this.state.error === '') return this.props.children
    return (
      <div className="app">
        <main className="screen paper welcome">
          <h1 className="display" style={{ margin: 0 }}>صار خطأ صغير</h1>
          <p className="muted bold" style={{ margin: 0, lineHeight: 1.7 }}>
            ما تخاف، بياناتك محفوظة. اكبس الزر لنرجع للبداية.
          </p>
          <button
            type="button"
            className="btn yellow"
            onClick={() => {
              this.setState({ error: '' })
              window.location.reload()
            }}
          >
            رجوع للتطبيق
          </button>
          <p className="muted ltr" style={{ margin: 0, fontSize: 12, wordBreak: 'break-word' }}>
            {this.state.error}
          </p>
        </main>
      </div>
    )
  }
}
