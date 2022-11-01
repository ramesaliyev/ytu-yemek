Simple menu fetcher for Yildiz Technical University. Serves menu as text. Useful for using in automation, such as IOS automations. Works on top of [cloudflare's workers](https://workers.cloudflare.com/).

#### API
    
    # Today
    https://ytuyemek.rx.workers.dev/
    
    # Day of current month.
    https://ytuyemek.rx.workers.dev/<day>
    https://ytuyemek.rx.workers.dev/09
    
    # Day of month.
    https://ytuyemek.rx.workers.dev/<day>/<month>
    https://ytuyemek.rx.workers.dev/09/05
    
    # Full date.
    https://ytuyemek.rx.workers.dev/<day>/<month>/<year>
    https://ytuyemek.rx.workers.dev/09/05/2022

#### Wrangler

    $ wrangler login
    $ wrangler dev
    $ wrangler publish