import { DeepPartial } from "fvtt-types/utils";
import { ReactNode, StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";

import { FoundryAppContext } from "./FoundryAppContext";
import { Constructor } from "./types";
import ApplicationV2 = foundry.applications.api.ApplicationV2;

import RenderOptions = foundry.applications.api.ApplicationV2.RenderOptions;

// so Constructor<Application> is any class which is an Application
type ApplicationV2Constructor = Constructor<ApplicationV2>;

/**
 * Wrap an existing Foundry Application class in this Mixin to override the
 * normal rendering behaviour and and use React instead.
 */
export function ReactApplicationV2Mixin<TBase extends ApplicationV2Constructor>(
  /**
   * Name to be attached to the created class. This is needed because minified
   * classes have weird names which can break foundry when thney get used as
   * HTML ids.
   */
  name: string,
  /**
   * The base class.
   */
  Base: TBase,
  /**
   * Render method - should return some JSX.
   */
  render: () => ReactNode,
) {
  class Reactified extends Base {
    // PROPERTIES

    /**
     * The React root for this application. This is our entry point to React's
     * rendering system.
     */
    protected reactRoot: Root | undefined;

    /**
     * A serial number to keep track of how many times we've rendered. This is
     * just for debugging.
     */
    protected serial = 0;

    // METHODS

    // From Atropos: _renderFrame only occurs once and is the most natural point
    // (given the current API) to bind the content div to your react component.
    override async _renderFrame(options: DeepPartial<RenderOptions>) {
      const element = await super._renderFrame(options);
      const target = this.hasFrame
        ? element.querySelector(".window-content")
        : element;
      if (target) {
        this.reactRoot = createRoot(target);
      }
      return element;
    }

    // _renderHTML is the semantically appropriate place to render updates to
    // the HTML of the app... or in our case, to ask to react to refresh.
    override _renderHTML() {
      const content = (
        <StrictMode>
          <FoundryAppContext.Provider
            value={this}
            key={"FoundryAppContextProvider"}
          >
            {render()}
          </FoundryAppContext.Provider>
        </StrictMode>
      );

      this.reactRoot?.render(content);
      this.serial += 1;
      // types expect a promise but we don't need to wait for the render to
      // complete
      return Promise.resolve();
    }

    // This override should be optional eventually but rn is needed to prevent
    // foundry throwing a wobbly
    override _replaceHTML(result: any, content: HTMLElement, options: any) {
      // nothing to do here
    }
  }

  // see comment on name arg above
  Object.defineProperty(Reactified, "name", { value: name });

  return Reactified;
}
