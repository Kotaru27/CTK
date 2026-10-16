
      /* Presentation only: track the metadata panel's actual rendered display.
         No metadata analysis, downloads, navigation or user actions are changed. */
      (() => {
        const metadata = document.getElementById('ytMetadataPanel');
        const emptyStage = document.getElementById('ytEmptyStage');
        if (!metadata || !emptyStage) return;
        const sync = () => { emptyStage.hidden = getComputedStyle(metadata).display !== 'none'; };
        new MutationObserver(sync).observe(metadata, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
        sync();
      })();
    